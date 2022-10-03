

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, CameraPersp, DrawSet, DYNAMIC_DRAW, FBO, FLOAT, FRONT, Mesh, POINTS, Program, Texture2D, VBO } from "@/webgl/libs/bolt";

import particlesVertexInstanced from "./shaders/particles/particles.vert";
import particlesFragmentInstanced from "./shaders/particles/particles.frag";

import depthVertexInstanced from "./shaders/depth/depth.vert";
import depthFragmentInstanced from "./shaders/depth/depth.frag";

import simulationVertex from "./shaders/simulation/simulation.vert";
import simulationFragment from "./shaders/simulation/simulation.frag";

import { mat4, vec3, vec4 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import GLTFLoader from "@/webgl/modules/gltf-loader";
import { GUI } from "lil-gui"
import EaseNumber from "@/webgl/helpers/EaseNumber";
import Raycast from "@/webgl/modules/raycast";
import EventListeners, { ITouchEvent } from "@/webgl/modules/event-listeners";
import Ray from "@/webgl/modules/raycast/Ray";
import { GL_RESIZE_TOPIC, GL_TOUCH_MOVE_TOPIC } from "@/webgl/modules/event-listeners/constants";
import Sphere from "@/webgl/modules/primitives/Sphere";

import normalVertexShader from "./shaders/normal/normal.vert";
import normalFragmentShader from "./shaders/normal/normal.frag";
import EaseVec3 from "@/webgl/helpers/EaseVector3";
import { getDeviceType } from "@/utils";

export default class extends Base {

	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	particleProgram!: Program;
	camera!: CameraPersp;
	assetsLoaded!: boolean;
	simulationProgram!: Program;
	simulationProgramLocations!: { oldPosition: number; oldVelocity: number; oldLifeTime: number; initLifeTime: number; initPosition: number; };
	instanceCount = config.particleCount;
	bolt: Bolt;
	orbit!: Orbit;
	mesh!: Mesh;
	drawSet!: DrawSet;
	transformFeedback!: TransformFeedback;
	particleDrawState!: DrawState;
	depthDrawState!: DrawState;
	depthFBO!: FBO;
	shadowLight!: CameraOrtho;
	lightSpaceMatrix = mat4.create();
	config: any;
	maptcapDark!: Texture2D;
	maptcapLight!: Texture2D;
	colorEase = new EaseNumber(config.colorMode === "light" ? 0 : 1, 0.02);
	raycaster = new Raycast();
	eventListeners = EventListeners.getInstance();
	ray: Ray;
	repellorDebug: DrawSet;
	repellorTarget = new EaseVec3(0, 0, 0, 0.3);
	repellorPosition = vec3.create();
	repellorPositinPrevious = vec3.create();

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

		this.repellorDebug = new DrawSet(
			new Mesh(new Sphere()), new Program(normalVertexShader, normalFragmentShader)
		);

		this.initScene();
		this.initSketch();
		//this.initGUI();
		this.initListeners();

	}

	initListeners() {

		this.eventListeners.listen(GL_TOUCH_MOVE_TOPIC, (e: any) => {

			const { normalized } = e.detail;

			const scale = vec3.distance(this.camera.position, this.camera.target);

			this.ray = this.raycaster.generateRayFromCamera(normalized.x, normalized.y, this.camera);

			const rayEnd = vec3.clone(this.ray.origin);
			const rayScaled = vec3.create();

			vec3.multiply(rayScaled, this.ray.direction, vec3.fromValues(scale, scale, scale));
			vec3.add(rayEnd, rayEnd, rayScaled);

			this.repellorTarget.x = rayEnd[0];
			this.repellorTarget.y = rayEnd[1];
			this.repellorTarget.z = rayEnd[2];

		});

		this.eventListeners.listen(GL_RESIZE_TOPIC, (e: any) => {

			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.camera.updateProjection(this.width / this.height);

		});

	}

	// construct the scene
	initScene() {

		this.camera = new CameraPersp({
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues(0, 30, 20),
			target: vec3.fromValues(0, 1, 0),
		});

		const frustumSize = 20;

		this.shadowLight = new CameraOrtho({
			left: - frustumSize,
			right: frustumSize,
			bottom: - frustumSize,
			top: frustumSize,
			near: 1,
			far: 100,
			position: vec3.fromValues(0, 15, 5),
			target: vec3.fromValues(0, 0, 0),
		});

		mat4.multiply(this.lightSpaceMatrix, this.shadowLight.projection, this.shadowLight.view);

		this.orbit = new Orbit(this.camera, {
			minRadius: 5,
			maxRadius: 50,
			minElevation: -Math.PI * 0.5,
			maxElevation: Math.PI * 0.5,
			ease: 0.04,
			zoomSpeed: 0.25,
			disableOrbit: getDeviceType() === "mobile",
		});

		this.bolt.setCamera(this.camera);
		this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
		this.bolt.enableDepth();

		this.resize();

	}

	// construct the sketch
	async initSketch() {


		// check if particle count is in local storage
		// if (localStorage.getItem("particleCount") !== null) {

		// 	this.instanceCount = parseInt(localStorage.getItem("particleCount") as string);
		// 	this.config.particleCount = this.instanceCount;

		// }

		this.depthFBO = new FBO({ width: 2048, height: 2048, depth: true });

		this.particleProgram = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const transformFeedbackVaryings = [
			"newPosition",
			"newVelocity",
			"newLifeTime"
		];

		this.simulationProgram = new Program(
			simulationVertex,
			simulationFragment,
			{
				transformFeedbackVaryings
			});

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("lifeTime", 4);
		this.simulationProgram.setFloat("particleLifeRate", this.config.particleLifeRate);
		this.simulationProgram.setFloat("particleLifeTime", this.config.particleLifeTime);
		this.simulationProgram.setFloat("particleSpeed", this.config.particleSpeed);
		this.simulationProgram.setFloat("repellorStrength", this.config.repellorStrength);
		this.simulationProgram.setFloat("curlStrength", this.config.curlStrength);
		this.simulationProgram.setFloat("time", 0);

		this.simulationProgramLocations = {
			"oldPosition": 0,
			"oldVelocity": 1,
			"oldLifeTime": 2,
			"initPosition": 3,
			"initLifeTime": 4
		};

		this.transformFeedback = new TransformFeedback({ bolt: this.bolt, count: this.instanceCount });

		this.maptcapDark = new Texture2D({
			imagePath: "/static/textures/matcap/matcap-black.jpeg",
			wrapS: this.gl.CLAMP_TO_EDGE,
			wrapT: this.gl.CLAMP_TO_EDGE,
		});

		this.maptcapLight = new Texture2D({
			imagePath: "/static/textures/matcap/gold-matcap.jpeg",
			wrapS: this.gl.CLAMP_TO_EDGE,
			wrapT: this.gl.CLAMP_TO_EDGE,
		});

		await this.maptcapDark.load();
		await this.maptcapLight.load();

		this.assetsLoaded = true;

		const positions: number[] = [];
		const offsets: number[] = [];
		const velocities: number[] = [];
		const lifeTimes: number[] = [];
		const normals: number[] = [];
		const scales: number[] = [];


		const n = 20;
		const n2 = n / 2;

		for (let i = 0; i < this.instanceCount; i++) {


			lifeTimes.push((Math.random() + 0.5) * 20);

			const positionX = Math.random() * n - n2;
			const positionY = Math.random() * n - n2;
			const positionZ = Math.random() * n - n2;

			offsets.push(positionX, positionY, positionZ)

			const normal = Math.random() * 2 - 1;
			const scale = (Math.random() * 0.5 + 0.5) + 0.25;

			positions.push(positionX, positionY, positionZ);

			scales.push(scale)
			normals.push(normal, normal, normal);

			velocities.push((Math.random() * 2 - 1) * 0.2);
			velocities.push((Math.random() * 2 - 1) * 0.2);
			velocities.push((Math.random() * 2 - 1) * 0.2);

		}

		// buffers
		const offset1VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);
		const offset2VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);

		const velocity1VBO = new VBO(new Float32Array(velocities), DYNAMIC_DRAW);
		const velocity2VBO = new VBO(new Float32Array(velocities), DYNAMIC_DRAW);

		const life1VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);
		const life2VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);

		const init1VBO = new VBO(new Float32Array(offsets), DYNAMIC_DRAW);
		const initLife1VBO = new VBO(new Float32Array(lifeTimes), DYNAMIC_DRAW);

		this.transformFeedback.bindVAOS(
			[
				{
					vbo1: offset1VBO,
					vbo2: offset2VBO,
					attributeLocation: this.simulationProgramLocations.oldPosition,
					size: 3,
					requiresSwap: true
				},
				{
					vbo1: velocity1VBO,
					vbo2: velocity2VBO,
					attributeLocation: this.simulationProgramLocations.oldVelocity,
					size: 3,
					requiresSwap: true
				},
				{
					vbo1: life1VBO,
					vbo2: life2VBO,
					attributeLocation: this.simulationProgramLocations.oldLifeTime,
					size: 1,
					requiresSwap: true
				},
				{
					vbo1: init1VBO,
					vbo2: init1VBO,
					attributeLocation: this.simulationProgramLocations.initPosition,
					size: 3,
					requiresSwap: false
				},
				{
					vbo1: initLife1VBO,
					vbo2: initLife1VBO,
					attributeLocation: this.simulationProgramLocations.initLifeTime,
					size: 1,
					requiresSwap: false
				}
			]
		);

		const pp = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const pointMesh = new Mesh({
			positions,
			normals
		}).setDrawType(POINTS);

		pointMesh.setAttribute(new Float32Array(scales), 1, 7);
		pointMesh.setVBO(offset1VBO, 3, 2);

		const pointMeshShadow = new Mesh({
			positions,
			normals
		}).setDrawType(POINTS);

		console.log(pointMesh);

		const particleDrawSet = new DrawSet(pointMesh, pp);

		const dp = new Program(depthVertexInstanced, depthFragmentInstanced);

		const depthDrawSet = new DrawSet(pointMeshShadow, dp);

		const bg = this.config[this.config.colorMode].backgroundColor;

		// prepare draw states

		// this.depthDrawState = new DrawState(this.bolt)
		// 	.setDrawSet(depthDrawSet)
		// 	.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 1)
		// 	.setVbo(life1VBO, 1, 4, FLOAT, 0, 1)
		// 	.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 1)
		// 	.setVbo(offset1VBO, 3, 2, FLOAT, 0, 1)
		// 	.setFbo(this.depthFBO)
		// 	.uniformFloat("particleScale", this.config.particleScale)
		// 	.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
		// 	.setViewport(0, 0, this.depthFBO.width, this.depthFBO.height)
		// 	.clear(0, 0, 0, 1)

		this.particleDrawState = new DrawState(this.bolt)
			.setDrawSet(particleDrawSet)
			.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 0)
			.setVbo(life1VBO, 1, 4, FLOAT, 0, 0)
			.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 0)
			.setVbo(offset1VBO, 3, 2, FLOAT, 0, 0)
			.uniformTexture("mapDepth", this.depthFBO.depthTexture!)
			.uniformFloat("shadowStrength", this.config.shadowStrength)
			.uniformFloat("particleScale", this.config.particleScale)
			.uniformFloat("colorMode", this.config.colorMode === "light" ? 0 : 1)
			.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
			.uniformTexture("mapMatcapLight", this.maptcapLight)
			.uniformTexture("mapMatcapDark", this.maptcapDark)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.clear(bg[0], bg[1], bg[2], bg[3])


	}

	initGUI() {

		const gui = new GUI();

		const folder = gui;

		// folder.add(this.config, "particleCount", [5000, 10000, 20000, 30000]).onChange((value: number) => {

		// 	localStorage.setItem("particleCount", value.toString());
		// 	window.location.reload();

		// });

		// folder.add(this.config, "particleScale", 0.1, 1).step(0.01).onChange((value: number) => {
		// 	this.particleDrawState.uniformFloat("particleScale", value);
		// });

		// folder.add(this.config, "particleSpeed", 0.1, 2).step(0.1).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("particleSpeed", value);
		// });

		// folder.add(this.config, "particleLifeRate", 0.01, 0.08).step(0.01).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("particleLifeRate", value);
		// });

		// folder.add(this.config, "curlStrength", 1, 5).step(0.1).onChange((value: number) => {
		// 	this.simulationProgram.activate();
		// 	this.simulationProgram.setFloat("curlStrength", value);
		// });

		// folder.add(this.config, "shadowStrength", 0.1, 1).step(0.1).onChange((value: number) => {
		// 	this.particleDrawState.uniformFloat("shadowStrength", value);
		// });

		// folder.add(this.config, "colorMode", ["light", "dark"]).onChange((value: string) => {
		// 	this.config.colorMode = value;
		// 	this.colorEase.value = value === "light" ? 0 : 1;
		// });

		folder.open();

	}

	resize() {


		this.bolt.resizeCanvasToDisplay();
		this.camera.updateProjection(this.canvas.width / this.canvas.height);

	}

	earlyUpdate(elapsed: number, delta: number) {

		return;

	}

	update(elapsed: number, delta: number) {

		if (!this.assetsLoaded) return;

		this.orbit.update();

		vec3.set(this.repellorPosition, this.repellorTarget.x, this.repellorTarget.y, this.repellorTarget.z);

		let d = vec3.distance(this.repellorPosition, this.repellorPositinPrevious);
		d = Math.min(d, 1) * 10;

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("time", elapsed);
		this.simulationProgram.setVector3("repellorPosition", this.repellorPosition);
		this.simulationProgram.setFloat("repellorScale", d);
		this.transformFeedback.compute();

		//this.depthDrawState.draw()

		const bgLight = this.config.light.backgroundColor;
		const bgDark = this.config.dark.backgroundColor;

		this.particleDrawState
			.uniformFloat("colorMode", this.colorEase.value)
			.clear(
				bgLight[0] * (1 - this.colorEase.value) + bgDark[0] * (this.colorEase.value),
				bgLight[1] * (1 - this.colorEase.value) + bgDark[1] * (this.colorEase.value),
				bgLight[2] * (1 - this.colorEase.value) + bgDark[2] * (this.colorEase.value),
				bgLight[3] * (1 - this.colorEase.value) + bgDark[3] * (this.colorEase.value))
			.draw()

		vec3.copy(this.repellorPositinPrevious, this.repellorPosition);

	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
