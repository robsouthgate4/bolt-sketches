import Bolt, { DrawSet, Mesh, ONE, ONE_MINUS_SRC_ALPHA, Program, SRC_ALPHA, Texture2D, ZERO } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/basic/basic.vert";
import fragmentShader from "./shaders/basic/basic.frag";

import gBufferVertexShader from "./shaders/gbuffer/gbuffer.vert";
import gBufferFragmentShader from "./shaders/gbuffer/gbuffer.frag";


import Plane from "@/webgl/modules/primitives/Plane";
import { vec3 } from "gl-matrix";
import GlobalGui from "../../globals/GlobalGui";

export default class Monster extends DrawSet {

	bolt = Bolt.getInstance()
	gui = GlobalGui.getInstance();
	settings: { depth: { power: number; offset: number; featherA: number; featherB: number; } };
	defaultProgram: Program;
	gBufferProgram: Program;

	constructor( { map, mapDepth }: { map: Texture2D, mapDepth: Texture2D } ) {

		const plane = new Plane( { widthSegments: 64, heightSegments: 64 } );

		const m = new Mesh( plane );

		const defaultP = new Program( gBufferVertexShader, gBufferFragmentShader );

		defaultP.activate();
		defaultP.transparent = true;
		defaultP.blendFunction = { src: ONE, dst: ZERO };
		defaultP.setTexture( "map", map );
		defaultP.setTexture( "mapDepth", mapDepth );

		super( m, defaultP );

		this.defaultProgram = defaultP;

		const s = 1.5;

		this.transform.scale = vec3.fromValues( s, s, s );
		this.transform.position = vec3.fromValues( 0, 0.96, 0 );

		this.settings = {
			depth: {
				power: 5,
				offset: 1.74,
				featherA: 0.51,
				featherB: 0.64,
			}
		};


		const depthSettings = this.gui.addFolder( "depth settings" );
		depthSettings.add( this.settings.depth, "power", 0, 5, 0.01 );
		depthSettings.add( this.settings.depth, "offset", 0, 5, 0.01 );
		depthSettings.add( this.settings.depth, "featherA", 0, 1, 0.01 );
		depthSettings.add( this.settings.depth, "featherB", 0, 1, 0.01 );

	}

	render() {

		this.program.activate();
		this.program.setVector3( "cameraPosition", this.bolt.camera.transform.position );
		this.program.setFloat( "depthPower", this.settings.depth.power );
		this.program.setFloat( "depthOffset", this.settings.depth.offset );
		this.program.setFloat( "featherA", this.settings.depth.featherA );
		this.program.setFloat( "featherB", this.settings.depth.featherB );

		this.bolt.draw( this );

	}


}
