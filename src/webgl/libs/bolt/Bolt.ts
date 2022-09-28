/*
Bolt renderer
*/

import Camera from "./Camera";
import DrawSet from "./DrawSet";
import Node from "./Node";
import { BACK, BLEND, CULL_FACE, DEPTH_TEST, NONE, ONE, ONE_MINUS_SRC_ALPHA, SRC_ALPHA } from "./Constants";
import { vec3 } from "gl-matrix";
import { BoltParams, Viewport } from "./Types";

export default class Bolt {

	private static _instance: Bolt;
	private _gl!: WebGL2RenderingContext;
	private _camera!: Camera;
	private _dpi!: number;
	private _viewport!: Viewport;
	private _autoSort = true;
	private _sortVec3 = vec3.create();
	private _transparentNodes: DrawSet[] = [];
	private _opaqueNodes: DrawSet[] = [];

	static getInstance(): Bolt {

		if (!Bolt._instance) Bolt._instance = new Bolt();
		return Bolt._instance;

	}

	/**
	 * Initialise a webgl context
	 * @param  {HTMLCanvasElement} canvas html canvas element
	 * @param  {BoltParams} {antialias} context params, antialias and DPI ( default 1 )
	 */
	init(canvas: HTMLCanvasElement, { antialias = false, dpi = 1, powerPreference = "default", alpha = true, premultipliedAlpha = true }: BoltParams) {

		this._gl = <WebGL2RenderingContext>(
			canvas.getContext("webgl2", { antialias, dpi, powerPreference, alpha, premultipliedAlpha })
		);

		this._printBanner();

		this._dpi = dpi;

		this.enableAlpha();
		this.enableCullFace();
		this.cullFace(BACK);

	}

	private _printBanner() {

		const style = [
			"font-size: 1em",
			"padding: 10px",
			"background-color: black",
			"color: yellow",
			"font-family: monospace",
		].join(";");

		console.log(`%c WebGL rendered with Bolt by Phantom.land \u26a1 \u26a1`, style);

	}

	/**
	 * Clear canvas with rgba colour components
	 * @param  {number} r red
	 * @param  {number} g green
	 * @param  {number} b blue
	 * @param  {number} a alpha
	 */
	clear(r: number, g: number, b: number, a: number) {

		this._gl.clearColor(r, g, b, a);
		this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

	}

	/**
	 * Set gl viewport offset and dimensions
	 * @param  {number} x offset x
	 * @param  {number} y offset y
	 * @param  {number} width width of the viewport
	 * @param  {number} height height of the viewport
	 */
	setViewPort(x: number, y: number, width: number, height: number) {

		this._gl.viewport(x, y, width, height);
		this._viewport = { offsetX: x, offsetY: y, width, height };

	}

	/**
	 * Attach a camera instance to the renderer
	 * @param  {Camera} camera
	 */
	setCamera(camera: Camera) {

		this._camera = camera;

	}

	get camera(): Camera {

		return this._camera;

	}

	enableAlpha() {

		this._gl.enable(BLEND);

	}

	enableDepth() {

		this._gl.enable(DEPTH_TEST);

	}

	disableDepth() {

		this._gl.disable(DEPTH_TEST);

	}

	enableCullFace() {

		this._gl.enable(CULL_FACE);

	}

	disableCullFace() {

		this._gl.disable(CULL_FACE);

	}

	cullFace(face: number) {

		this._gl.cullFace(face);

	}

	enableAlphaBlending() {

		this._gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);

	}

	enableAdditiveBlending() {

		this._gl.blendFunc(ONE, ONE);

	}

	/**
	 * Returns gl context
	 */
	getContext() {

		return this._gl;

	}

	/**
	 * Resizes the canvas to fit full screen
	 * Updates the currently bound camera perspective
	 */
	resizeFullScreen() {

		const dpi = Math.min(this._dpi, window.devicePixelRatio || 1);

		const displayWidth = this._gl.canvas.clientWidth * dpi;
		const displayHeight = this._gl.canvas.clientHeight * dpi;

		// Check if the this.gl.canvas is not the same size.
		const needResize =
			this._gl.canvas.width !== displayWidth ||
			this._gl.canvas.height !== displayHeight;

		if (needResize) {

			this._gl.canvas.width = displayWidth;
			this._gl.canvas.height = displayHeight;

		}

	}

	/**
	 * @param  {DrawSet[]} nodes
	 * calculate node depth from the currently bound camera
	 */
	_sortByDepth(nodes: DrawSet[]) {

		nodes.forEach((node: Node) => {

			vec3.copy(this._sortVec3, node.worldPosition);
			vec3.transformMat4(this._sortVec3, this._sortVec3, this._camera.projectionView);
			node.cameraDepth = this._sortVec3[2];

		});

		nodes.sort((a: Node, b: Node) => {

			return b.cameraDepth - a.cameraDepth;

		});

	}

	/**
	 * Trigger a depth sort of opaque and transparent nodes
	 */
	_forceDepthSort() {

		this._sortByDepth(this._opaqueNodes);
		this._sortByDepth(this._transparentNodes);

	}

	/**
	 * @param  {Node} drawables
	 */
	draw(drawables: Node) {

		this._camera.update();

		const render = (node: Node) => {

			if (!node.draw) return;

			// if node is a batch then render the mesh and update shader matrices
			if (node instanceof DrawSet) {

				// only draw if mesh has a valid vao
				if (!node.mesh.vao) return;

				const { program } = node;

				node.updateMatrices(program, this._camera);

				if (program.transparent) {

					// set the current blend mode for bound shader
					this._gl.blendFunc(program.blendFunction.src, program.blendFunction.dst);

				}

				if (program.cullFace !== undefined) {

					if (program.cullFace === NONE) {

						this.disableCullFace();

					} else {

						this.enableCullFace();
						this.cullFace(program.cullFace);

					}

				}

				// skin meshes require node reference to update skin matrices
				if (node.mesh.isSkinMesh !== undefined) {

					node.mesh.draw(program, node);

				} else {

					node.mesh.draw(program);

				}

			}

		};

		{

			this._opaqueNodes = [];
			this._transparentNodes = [];

			if (!drawables.draw) return;

			// traverse nodes and sort into transparent and opaque lists
			drawables.traverse((node: Node) => {

				drawables.updateModelMatrix();

				if (node instanceof DrawSet) {

					if (node.program.transparent) {

						this._transparentNodes.push(node);

					} else {

						this._opaqueNodes.push(node);

					}


				}

			});

			if (this._autoSort) {

				this._sortByDepth(this._opaqueNodes);
				this._sortByDepth(this._transparentNodes);

			}

			// draw opaque nodes first
			this._opaqueNodes.forEach((node: Node) => {

				render(node);

			});

			// draw transparent nodes last
			this._transparentNodes.forEach((node: Node) => {

				render(node);

			});

		}

	}

	public get dpi(): number {

		return this._dpi;

	}
	public set dpi(value: number) {

		this._dpi = value;

	}

	public get viewport(): Viewport {

		return this._viewport;

	}

	public get autoSort() {

		return this._autoSort;

	}
	public set autoSort(value) {

		this._autoSort = value;

	}


}
