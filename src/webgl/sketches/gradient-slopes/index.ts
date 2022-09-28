

import Base from "@webgl/Base";
import Bolt, { BACK, CameraOrtho, CameraPersp, DrawSet, FBO, FRONT, LINES, LINE_LOOP, LINE_STRIP, Mesh, NONE, ONE_MINUS_SRC_ALPHA, POINTS, Program, SRC_ALPHA, Texture2D, TRIANGLES } from "@/webgl/libs/bolt";

import normalVertex from "./shaders/normal/normal.vert";
import normalFragment from "./shaders/normal/normal.frag";

import { vec2, vec3 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import { GUI } from "lil-gui"
import EaseNumber from "@/webgl/helpers/EaseNumber";
import Raycast from "@/webgl/modules/raycast";
import EventListeners, { ITouchEvent } from "@/webgl/modules/event-listeners";
import Ray from "@/webgl/modules/raycast/Ray";
import { GL_RESIZE_TOPIC, GL_TOUCH_MOVE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import GLTFLoader from "@/webgl/modules/gltf-loader";

export default class extends Base {

	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	camera!: CameraOrtho;
	assetsLoaded!: boolean;
	bolt: Bolt;
	orbit!: Orbit;
	mesh!: Mesh;
	drawSet!: DrawSet;
	gridDrawState!: DrawState;
	config: any;
	raycaster = new Raycast();
	eventListeners = EventListeners.getInstance();
	ray: Ray;
	frustumSize = 1;

	constructor() {

		super();

		this.config = config;

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById("experience");
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		// initialize bolt
		this.bolt = Bolt.getInstance();
		this.bolt.init(this.canvas, {
			antialias: true,
			dpi: Math.min(2, window.devicePixelRatio),
			powerPreference: "high-performance",
		});

		this.gl = this.bolt.getContext();
		this.bolt.enableAlpha();

		this.initScene();
		this.initSketch();
		this.initGUI();
		this.initListeners();

	}

	initListeners() {

		this.eventListeners.listen(GL_TOUCH_MOVE_TOPIC, (e: any) => {

			const { normalized } = e.detail;

			const scale = vec3.distance(this.camera.position, this.camera.target);

			this.ray = this.raycaster.generateRayFromCamera(normalized.x, normalized.y, this.camera);

		});

		this.eventListeners.listen(GL_RESIZE_TOPIC, (e: any) => {

			this.resize();

		});

	}

	// construct the scene
	initScene() {

		const w = window.innerWidth;
		const h = window.innerHeight;

		const ratio = w / h;

		this.camera = new CameraOrtho({
			left: this.frustumSize * ratio / - 2,
			right: this.frustumSize * ratio / 2,
			bottom: - this.frustumSize / 2,
			top: this.frustumSize / 2,
			near: 0.01,
			far: 1000,
			position: vec3.fromValues(0, 0, 1),
			target: vec3.fromValues(0, 0, 0)
		});

		this.bolt.setCamera(this.camera);
		this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
		this.bolt.enableDepth();

		this.resize();

	}

	// construct the sketch
	async initSketch() {

		const gltfLoader = new GLTFLoader(this.bolt, true);
		await gltfLoader.load("static/models/gltf/examples/grid/scene.glb");

		const plane = gltfLoader.drawSetsFlattened[0].mesh;

		this.assetsLoaded = true;

		const p = new Program(normalVertex, normalFragment);
		p.transparent = true;
		p.blendFunction = { src: SRC_ALPHA, dst: ONE_MINUS_SRC_ALPHA };

		const m = plane.setDrawType(TRIANGLES);
		const gridDrawSet = new DrawSet(m, p);
		gridDrawSet.transform.rotateX(Math.PI * 0.8);

		this.gridDrawState = new DrawState(this.bolt)
			.setDrawSet(gridDrawSet)
			.setCullFace(NONE)
			//.uniformVector3("noiseAscale", this.config.noiseA.scale.value)
			.uniformVector3("colorA", vec3.fromValues(this.config.colorA.value[0], this.config.colorA.value[1], this.config.colorA.value[2]))
			.uniformVector3("colorB", vec3.fromValues(this.config.colorB.value[0], this.config.colorB.value[1], this.config.colorB.value[2]))
			.uniformVector3("colorC", vec3.fromValues(this.config.colorC.value[0], this.config.colorC.value[1], this.config.colorC.value[2]))
			.clear(12 / 255, 180 / 255, 198 / 255, 1)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)


	}

	initGUI() {

		const gui = new GUI();

		Object.entries(this.config).forEach(([key, value]) => {
			const folder = gui.addFolder(key);
			if (key.includes("color")) {
				//@ts-ignore
				folder.addColor(value, "value").onChange((e: any) => {
					this.config[key].value = e;
					this.gridDrawState.uniformVector3(key, this.config[key].value);
				});
			}
			if (key.includes("noise")) {
				//@ts-ignore
				folder.add(value.scale, "x", 0, 1).onChange((e: any) => {
					// this.config[key].scale.x = e;
					// this.gridDrawState.uniformVector3("noiseAscale", this.config[key].scale);
				});
				//@ts-ignore
				folder.add(value.scale, "y", 0, 1).onChange((e: any) => {
					// this.config[key].scale.x = e;
					// this.gridDrawState.uniformVector3("noiseAscale", this.config[key].scale);
				});
				//@ts-ignore
				folder.add(value.scale, "z", 0, 1).onChange((e: any) => {
					// this.config[key].scale.x = e;
					// this.gridDrawState.uniformVector3("noiseAscale", this.config[key].scale);
				});
			}
		});

	}

	resize() {

		this.bolt.resizeFullScreen();

		const aspect = this.gl.canvas.width / this.gl.canvas.height;

		this.camera.left = this.frustumSize * aspect / - 2;
		this.camera.right = this.frustumSize * aspect / 2;
		this.camera.bottom = - this.frustumSize / 2;
		this.camera.top = this.frustumSize / 2;

		this.camera.updateProjection();

	}

	earlyUpdate(elapsed: number, delta: number) {

		return;

	}

	update(elapsed: number, delta: number) {

		if (!this.assetsLoaded) return;

		this.gridDrawState
			.uniformFloat("time", elapsed)
			.uniformVector2("resolution", vec2.fromValues(this.canvas.width, this.canvas.height))
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.draw();

	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
