import { Pass } from "./Pass";

import vertexShader from "./shaders/bokeh/bokeh.vert";
import fragmentShader from "./shaders/bokeh/bokeh.frag";
import Bolt, { Program, FBO, Texture2D, CameraPersp } from "@/webgl/libs/bolt";
import { vec2 } from "gl-matrix";

export default class BokehPass extends Pass {

	program!: Program;
	bolt!: Bolt;
	t: number;
	gl: WebGL2RenderingContext;

	constructor( bolt: Bolt, {
		width = 256,
		height = 256
	} ) {

		super( bolt, {
			width,
			height,
		} );

		this.bolt = bolt;

		const camera = this.bolt.camera as CameraPersp;

		this.gl = this.bolt.getContext();

		this.program = new Program( vertexShader, fragmentShader );
		this.program.activate();
		this.program.setVector2( "cameraPlanes", vec2.fromValues( camera.near, camera.far ) );
		this.program.setVector2( "resolution", vec2.fromValues( width, height ) );

		this.program.setFloat( "aspect", this.gl.canvas.width / this.gl.canvas.height );

		this.t = 0;

	}

	draw( readFBO: FBO, writeFbo: FBO, texture?: Texture2D, renderToScreen?: boolean ) {

		if ( ! renderToScreen ) {

			writeFbo.bind();

		}

		this.program.activate();
		this.program.setTexture( "map", texture ? texture : readFBO.targetTexture );
		this.program.setTexture( "mapDepth", readFBO.depthTexture );

		this.fullScreenTriangle.draw( this.program );

		readFBO.unbind();
		writeFbo.unbind();


	}

}
