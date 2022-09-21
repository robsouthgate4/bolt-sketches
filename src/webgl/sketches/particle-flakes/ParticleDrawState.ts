import DrawState from "@/webgl/modules/draw-state";
import Bolt, {  DrawSet, GeometryBuffers, Mesh, NONE, Program } from "@bolt-webgl/core"
import particlesVertexInstanced from "./shaders/particles/particles.vert";
import particlesFragmentInstanced from "./shaders/particles/particles.frag";
import config from "./config";

export default class ParticleDrawState extends DrawState {

	constructor(bolt: Bolt) {

		super(Bolt.getInstance());

		const scaleX = 0.1 * config.particleScale;
		const scaleZ = 0.2 * config.particleScale;

		const triangle: GeometryBuffers = {
			positions: [
				-scaleX, 0, 0,
				scaleX, 0, 0,
				0, 0, -scaleZ,
			],
			indices: [
				0, 1, 2
			],
			normals: [
				0, 1, 0,
				0, 1, 0,
				0, 1, 0
			]
		}

		const mesh = new Mesh( triangle, {
			instanced: true,
			instanceCount: config.particleCount,
		})

		const particleProgram = new Program( particlesVertexInstanced, particlesFragmentInstanced );
		const drawSet = new DrawSet( mesh, particleProgram );

		this.setDrawSet( drawSet );

	}

}