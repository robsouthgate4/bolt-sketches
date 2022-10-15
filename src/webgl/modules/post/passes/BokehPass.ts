import { Pass } from "./Pass";

import vertexShader from "./shaders/bokeh/bokeh.vert";
import fragmentShader from "./shaders/bokeh/bokeh.frag";
import Bolt, { Program, FBO, Texture2D, CameraPersp } from "@/webgl/libs/bolt";
import { vec2, vec4 } from "gl-matrix";

export default class BokehPass extends Pass {

	program!: Program;
	bolt!: Bolt;
	t: number;
	gl: WebGL2RenderingContext;

	constructor( bolt: Bolt, {
		width = 256,
		height = 256,
		ndofstart = 3.0, // near dof blur start
		ndofdist = 4.0, // near dof blur falloff distance
		fdofstart = 2.0, // far dof blur start
		fdofdist = 3.0, // far dof blur falloff distance
		vignetting = true, // use optical lens vignetting
		vignout = 1.3, // vignetting outer border
		vignin = 1.0, // vignetting inner border
		vignfade = 22.0, // f-stops till vignete fades
		focus = vec2.fromValues( 0.5, 0.5 ), // autofocus point on screen (if not set to vec2(0.0, 0.0))
		maxblur = 1.0, // clamp value of max blur (0.0 = no blur, 1.0 default)
		threshold = 0.7, // highlight threshold;
		gain = 100.0, // highlight gain;
		bias = 0.5, // bokeh edge bias
		fringe = 0.7, // chromatic aberration / fringing
		noise = false, // use noise instead of pattern for sample dithering
		namount = 0.0001, // dither amount
		depthblur = true, // blur the depth buffer
		dbsize = 1.0, // depth blur size
		autofocus = false, // use autofocus in shader (not finished)
		CoC = 0.08, // circle of confusion size in mm (35mm film = 0.03mm)
		focalDepth = 0.9, //focal distance value in meters, but you may use autofocus option below
		focalLength = 10.0, //focal length in mm
		fstop = 1.9, //f-stop value
		showFocus = false, //show debug focus point and focal range (red = focal point, green = focal range)
		manualdof = false, //manual focal depth, if not set to false overrides autofocus
		rings = 3,
		samples = 3
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
		this.program.setVector4( "dofParams", vec4.fromValues( ndofstart, ndofdist, fdofstart, fdofdist ) );

		this.program.setFloat( "aspect", this.gl.canvas.width / this.gl.canvas.height );
		this.program.setFloat( "CoC", CoC );
		this.program.setVector4( "vignetteParams", vec4.fromValues( vignetting ? 1 : 0, vignout, vignin, vignfade ) );

		this.program.setBool( "autofocus", autofocus ? 1 : 0 );
		this.program.setVector2( "focus", focus );
		this.program.setFloat( "maxblur", maxblur );

		this.program.setFloat( "threshold", threshold );
		this.program.setFloat( "gain", gain );
		this.program.setFloat( "bias", bias );
		this.program.setFloat( "fringe", fringe );
		this.program.setBool( "noise", noise ? 1 : 0 );
		this.program.setFloat( "namount", namount );
		this.program.setBool( "depthblur", depthblur ? 1 : 0 );
		this.program.setFloat( "dbsize", dbsize );

		this.program.setFloat( "focalDepth", focalDepth );
		this.program.setFloat( "focalLength", focalLength );
		this.program.setFloat( "fstop", fstop );
		this.program.setBool( "showFocus", showFocus ? 1 : 0 );

		this.program.setBool( "manualdof", manualdof ? 1 : 0 );
		this.program.setInt( "rings", rings );
		this.program.setInt( "samples", samples );


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
