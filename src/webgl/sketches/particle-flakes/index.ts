

import Base from "@webgl/Base";
import Bolt, { CameraOrtho, CameraPersp, DrawSet, DYNAMIC_DRAW, FBO, FLOAT, FRONT, Mesh, Program, Texture2D, VBO } from "@bolt-webgl/core";

import particlesVertexInstanced from "./shaders/particles/particles.vert";
import particlesFragmentInstanced from "./shaders/particles/particles.frag";

import depthVertexInstanced from "./shaders/depth/depth.vert";
import depthFragmentInstanced from "./shaders/depth/depth.frag";

import simulationVertex from "./shaders/simulation/simulation.vert";
import simulationFragment from "./shaders/simulation/simulation.frag";

import { mat4, vec3 } from "gl-matrix";

import Orbit from "@webgl/modules/orbit";
import TransformFeedback from "@/webgl/modules/transform-feedback";
import DrawState from "@/webgl/modules/draw-state";
import config from "./config";
import GLTFLoader from "@/webgl/modules/gltf-loader";


export default class extends Base {

	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	particleProgram!: Program;
	lightPosition: vec3;
	camera: CameraPersp;
	assetsLoaded!: boolean;
	simulationProgram!: Program;
	simulationProgramLocations!: { oldPosition: number; oldVelocity: number; oldLifeTime: number; initLifeTime: number; initPosition: number; };
	instanceCount = config.particleCount;
	bolt: Bolt;
	orbit: Orbit;
	mesh!: Mesh;
	drawSet!: DrawSet;
	transformFeedback!: TransformFeedback;
	particleDrawState!: DrawState;
	depthDrawState!: DrawState;
	depthFBO!: FBO;
	shadowLight: CameraOrtho;
	lightSpaceMatrix: mat4;

	constructor() {

		super();

		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.canvas = <HTMLCanvasElement>document.getElementById("experience");
		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.bolt = Bolt.getInstance();
		this.bolt.init(this.canvas, { antialias: true, dpi: Math.min(2, window.devicePixelRatio), powerPreference: "high-performance" });

		this.depthFBO = new FBO({ width: 2048, height: 2048, depth: true });
		this.gl = this.bolt.getContext();

		this.particleProgram = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const transformFeedbackVaryings = [
			"newPosition",
			"newVelocity",
			"newLifeTime"
		];

		this.simulationProgram = new Program(simulationVertex, simulationFragment,
			{
				transformFeedbackVaryings
			});

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("lifeTime", 4);
		this.simulationProgram.setFloat("time", 0);

		this.simulationProgramLocations = {
			"oldPosition": 0,
			"oldVelocity": 1,
			"oldLifeTime": 2,
			"initPosition": 3,
			"initLifeTime": 4
		};

		this.lightPosition = vec3.fromValues(0, 10, 0);


		this.camera = new CameraPersp({
			aspect: this.canvas.width / this.canvas.height,
			fov: 45,
			near: 0.1,
			far: 1000,
			position: vec3.fromValues(0, 30, 30),
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

		this.lightSpaceMatrix = mat4.create();
		mat4.multiply(this.lightSpaceMatrix, this.shadowLight.projection, this.shadowLight.view);

		this.orbit = new Orbit(this.camera, {
			minElevation: -Infinity,
			maxElevation: Infinity,
		});

		this.bolt.setCamera(this.camera);
		this.bolt.setViewPort(0, 0, this.canvas.width, this.canvas.height);
		this.bolt.enableDepth();

		this.transformFeedback = new TransformFeedback({ bolt: this.bolt, count: this.instanceCount });

		this.init();


	}

	async init() {

		const gltfLoader = new GLTFLoader(this.bolt, true);
		await gltfLoader.load("/static/models/gltf/examples/disk-particle/scene.glb");
		const diskMesh = gltfLoader.drawSetsFlattened[0].mesh;

		const matcap = new Texture2D({
			imagePath: "/static/textures/matcap/matcap-ice.jpeg",
			wrapS: this.gl.CLAMP_TO_EDGE,
			wrapT: this.gl.CLAMP_TO_EDGE,
		});

		await matcap.load();

		this.assetsLoaded = true;

		const offsets: number[] = [];
		const velocities: number[] = [];
		const lifeTimes: number[] = [];

		for (let i = 0; i < this.instanceCount; i++) {

			lifeTimes.push((Math.random() + 0.5) * 20);

			offsets.push((Math.random() * 2 - 1) * 5);
			offsets.push((Math.random() * 2 - 1) * 5);
			offsets.push((Math.random() * 2 - 1) * 5);

			velocities.push(0);
			velocities.push(0);
			velocities.push(0);

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


		this.resize();

		const pp = new Program(particlesVertexInstanced, particlesFragmentInstanced);

		const particleDrawSet = new DrawSet(new Mesh({
			...diskMesh.buffers
		}, {
			instanced: true,
			instanceCount: config.particleCount
		}), pp);

		const dp = new Program(depthVertexInstanced, depthFragmentInstanced);

		const depthDrawSet = new DrawSet(new Mesh({
			...diskMesh.buffers
		}, {
			instanced: true,
			instanceCount: config.particleCount
		}), dp);


		this.depthDrawState = new DrawState(this.bolt)
			.setDrawSet(depthDrawSet)
			.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 1)
			.setVbo(life1VBO, 1, 4, FLOAT, 0, 1)
			.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 1)
			.setVbo(offset1VBO, 3, 2, FLOAT, 0, 1)
			.setFbo(this.depthFBO)
			.uniformFloat("particleScale", config.particleScale)
			.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
			.setViewport(0, 0, this.depthFBO.width, this.depthFBO.height)
			.clear(0, 0, 0, 1)

		this.particleDrawState = new DrawState(this.bolt)
			.setDrawSet(particleDrawSet)
			.setVbo(velocity1VBO, 3, 6, FLOAT, 0, 1)
			.setVbo(life1VBO, 1, 4, FLOAT, 0, 1)
			.setVbo(initLife1VBO, 1, 5, FLOAT, 0, 1)
			.setVbo(offset1VBO, 3, 2, FLOAT, 0, 1)
			.uniformTexture("mapDepth", this.depthFBO.depthTexture!)
			.uniformFloat("shadowStrength", 0.6)
			.uniformFloat("particleScale", config.particleScale)
			.uniformMatrix4("lightSpaceMatrix", this.lightSpaceMatrix)
			.uniformTexture("mapMatcap", matcap)
			.setViewport(0, 0, this.canvas.width, this.canvas.height)
			.clear(0.9, 0.92, 0.9, 1)


	}

	resize() {

		this.bolt.resizeFullScreen();
		this.camera.updateProjection(this.gl.canvas.width / this.gl.canvas.height);

	}

	earlyUpdate(elapsed: number, delta: number) {

		return;

	}

	update(elapsed: number, delta: number) {

		if (!this.assetsLoaded) return;

		this.orbit.update();

		this.simulationProgram.activate();
		this.simulationProgram.setFloat("time", elapsed);
		this.transformFeedback.compute();

		this.depthDrawState.draw()
		this.particleDrawState.draw();


	}

	lateUpdate(elapsed: number, delta: number) {

		return;

	}

}
