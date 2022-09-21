import DrawState from "@/webgl/modules/draw-state";
import Bolt, { BACK, CameraOrtho, DrawSet, FRONT, GeometryBuffers, Mesh, NONE, Program } from "@bolt-webgl/core"
import depthVertexInstanced from "./shaders/depth/depth.vert";
import depthFragmentInstanced from "./shaders/depth/depth.frag";
import { mat4, vec3 } from "gl-matrix";
import config from "./config";

export default class DepthDrawState extends DrawState {

	constructor(bolt: Bolt) {

		super(Bolt.getInstance());

		const scaleX = 0.3 * config.particleScale;
		const scaleZ = 0.5 * config.particleScale;

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

		const depthProgram = new Program( depthVertexInstanced, depthFragmentInstanced );

		const drawSet = new DrawSet( mesh, depthProgram );

		this.setDrawSet( drawSet );

	}

}