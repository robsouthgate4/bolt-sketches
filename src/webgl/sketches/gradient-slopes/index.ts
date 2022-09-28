

import Base from "@webgl/Base";
import Bolt, { BACK, CameraOrtho, CameraPersp, DrawSet, FBO, FRONT, LINES, LINE_LOOP, LINE_STRIP, Mesh, NONE, Program, Texture2D, TRIANGLES } from "@/webgl/libs/bolt";

import normalVertex from "./shaders/normal/normal.vert";
import normalFragment from "./shaders/normal/normal.frag";

import { mat4, vec3, vec4 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import { GUI } from "lil-gui"
import EaseNumber from "@/webgl/helpers/EaseNumber";
import Raycast from "@/webgl/modules/raycast";
import EventListeners, { ITouchEvent } from "@/webgl/modules/event-listeners";
import Ray from "@/webgl/modules/raycast/Ray";
import { GL_RESIZE_TOPIC, GL_TOUCH_MOVE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import EaseVec3 from "@/webgl/helpers/EaseVector3";
import Plane from "@/webgl/modules/primitives/Plane";
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
	colorEase = new EaseNumber(config.colorMode === "light" ? 0 : 1, 0.02);
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
		this.bolt.init(this.canvas, { antialias: true, dpi: Math.min(2, window.devicePixelRatio), powerPreference: "high-performance" });

		this.gl = this.bolt.getContext();

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
			near: 0.1,
			far: 1000,
			position: vec3.fromValues(0, 0, 1),
			target: vec3.fromValues(0, 0, 0)
		});

		this.orbit = new Orbit(this.camera, {
			minElevation: -Math.PI * 0.5,
			maxElevation: Math.PI * 0.5,
			ease: 0.2,
			zoomSpeed: 0.25
		});

		this.bolt.setCamera(this.camera);
		this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
		this.bolt.enableDepth();

		this.resize();

	}

	// construct the sketch
	async initSketch() {

		const gltfLoader = new GLTFLoader(this.bolt, true);
		const scene = await gltfLoader.load("static/models/gltf/examples/grid/scene.glb");

		const plane = gltfLoader.drawSetsFlattened[0].mesh;
		console.log(plane);

		this.assetsLoaded = true;

		const p = new Program(normalVertex, normalFragment);

		const m = plane.setDrawType(LINES);
		const gridDrawSet = new DrawSet(m, p);

		gridDrawSet.transform.rotateX(Math.PI * 0.7);

		const bg = this.config[this.config.colorMode].backgroundColor;

		this.gridDrawState = new DrawState(this.bolt)
			.setDrawSet(gridDrawSet)
			.setCullFace(BACK)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.clear(bg[0], bg[1], bg[2], bg[3])


	}

	initGUI() {

		const gui = new GUI();
		const folder = gui;
		folder.open();

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

		this.orbit.update();
		this.gridDrawState
			.uniformFloat("time", elapsed)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.draw();

	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
