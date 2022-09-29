

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, DrawSet, Mesh, ONE_MINUS_SRC_ALPHA, Program, SRC_ALPHA, TRIANGLES } from "@/webgl/libs/bolt";

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
import { hexToRgb, normalizeColor } from "@/utils";
import EaseVec3 from "@/webgl/helpers/EaseVector3";

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
	peakScale = new EaseVec3(config.peakScale.value.x, config.peakScale.value.y, config.peakScale.value.z, 0.1);
	colorNoiseScale = new EaseVec3(config.colorNoiseScale.value.x, config.colorNoiseScale.value.y, config.colorNoiseScale.value.z, 0.1);
	noiseSlopeFrequency = new EaseNumber(config.noiseSlopeFrequency.value, 0.1);
	maxPeak = new EaseNumber(config.maxPeak.value, 0.1);
	color1 = new EaseVec3(...normalizeColor(hexToRgb(config.color1.value)), 0.1);
	color2 = new EaseVec3(...normalizeColor(hexToRgb(config.color2.value)), 0.1);
	color3 = new EaseVec3(...normalizeColor(hexToRgb(config.color3.value)), 0.1);
	animationSpeed = new EaseNumber(config.animationSpeed.value, 0.2);

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
		gridDrawSet.transform.rotateX(Math.PI * 0.82);

		this.gridDrawState = new DrawState(this.bolt)
			.setDrawSet(gridDrawSet)
			.clear(0, 0, 0, 1)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)


	}

	initGUI() {

		const gui = new GUI();

		Object.entries(this.config).forEach(([key, value]) => {
			const folder = gui.addFolder(key);

			if (key === "color1" || key === "color2" || key === "color3") {

				//@ts-ignore
				folder.addColor(value, "value").onChange((e: any) => {

					this.config[key].value = e;
					const rgb = normalizeColor(hexToRgb(e));
					this[key].x = rgb[0];
					this[key].y = rgb[1];
					this[key].z = rgb[2];

				});
			}

			if (key === "noiseSlopeFrequency") {

				//@ts-ignore
				folder.add(value, "value", 0, 5).onChange((e: any) => {
					this.config[key].value = e;
					this.noiseSlopeFrequency.value = e;
				});

			}

			if (key === "maxPeak") {

				//@ts-ignore
				folder.add(value, "value", 0, 2).onChange((e: any) => {
					this.config[key].value = e;
					this.maxPeak.value = e;
				});

			}


			if (key === "peakScale") {
				//@ts-ignore
				folder.add(value.value, "x", 0, 2).onChange((e: any) => {
					this.config[key].value.x = e;
					this.peakScale.x = e;
				});
				//@ts-ignore
				folder.add(value.value, "y", 0, 2).onChange((e: any) => {
					this.config[key].value.y = e;
					this.peakScale.y = e;
				});
				//@ts-ignore
				folder.add(value.value, "z", 0, 2).onChange((e: any) => {
					this.config[key].value.z = e;
					this.peakScale.z = e;
				});
			}

			if (key === "colorNoiseScale") {
				//@ts-ignore
				folder.add(value.value, "x", 0, 5).onChange((e: any) => {
					this.config[key].value.x = e;
					this.colorNoiseScale.x = e;
				});
				//@ts-ignore
				folder.add(value.value, "y", 0, 5).onChange((e: any) => {
					this.config[key].value.y = e;
					this.colorNoiseScale.y = e;
				});
				//@ts-ignore
				folder.add(value.value, "z", 0, 5).onChange((e: any) => {
					this.config[key].value.z = e;
					this.colorNoiseScale.z = e;
				});
			}

			if (key === "animationSpeed") {
				//@ts-ignore
				folder.add(value, "value", 0, 2).onChange((e: any) => {
					this.config[key].value = e;
					this.animationSpeed.value = e;
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
			.uniformFloat("animationSpeed", this.animationSpeed.value)
			.uniformVector3("color1", vec3.fromValues(this.color1.x, this.color1.y, this.color1.z))
			.uniformVector3("color2", vec3.fromValues(this.color2.x, this.color2.y, this.color2.z))
			.uniformVector3("color3", vec3.fromValues(this.color3.x, this.color3.y, this.color3.z))
			.uniformFloat("noiseSlopeFrequency", this.noiseSlopeFrequency.value)
			.uniformFloat("maxPeak", this.maxPeak.value)
			.uniformVector3("peakScale", vec3.fromValues(this.peakScale.x, this.peakScale.y, this.peakScale.z))
			.uniformVector3("colorNoiseScale", vec3.fromValues(this.colorNoiseScale.x, this.colorNoiseScale.y, this.colorNoiseScale.z))
			.uniformVector2("resolution", vec2.fromValues(this.canvas.width, this.canvas.height))
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.draw();

	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
