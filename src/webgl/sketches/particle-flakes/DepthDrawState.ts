import DrawState from "@/webgl/modules/draw-state";
import Bolt, { CameraOrtho, DrawSet, GeometryBuffers, Mesh, NONE, Program } from "@bolt-webgl/core"
import depthVertexInstanced from "./shaders/depth/depth.vert";
import depthFragmentInstanced from "./shaders/depth/depth.frag";
import { mat4, vec3 } from "gl-matrix";

export default class DepthDrawState extends DrawState {

	shadowLight: any;
	lightSpaceMatrix: mat4;

	constructor(bolt: Bolt) {

		super(Bolt.getInstance());

		const frustumSize = 80;

		this.shadowLight = new CameraOrtho( {
			left: - frustumSize,
			right: frustumSize,
			bottom: - frustumSize,
			top: frustumSize,
			near: 0.1,
			far: 20,
			position: vec3.fromValues( 0, 10, 0.01 ),
			target: vec3.fromValues( 0, 0, 0 ),
		} );

		this.lightSpaceMatrix = mat4.create();
		mat4.multiply( this.lightSpaceMatrix, this.shadowLight.projection, this.shadowLight.view );

		const scaleX = 0.3;
		const scaleZ = 0.5;

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
			instanceCount: 10000,
		})

		const depthProgram = new Program( depthVertexInstanced, depthFragmentInstanced );
		depthProgram.activate();
		depthProgram.setMatrix4( "lightSpaceMatrix", this.lightSpaceMatrix );
		depthProgram.cullFace = NONE; // TODO: may need to cull front faces

		const drawSet = new DrawSet( mesh, depthProgram );

		this.drawSet( drawSet );

	}

}