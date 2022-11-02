import Bolt, { DrawSet, Mesh, Program, Texture2D } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/basic/basic.vert";
import fragmentShader from "./shaders/basic/basic.frag";
import Plane from "@/webgl/modules/primitives/Plane";
import { vec3 } from "gl-matrix";
import GlobalGui from "../../globals/GlobalGui";

export default class Monster extends DrawSet {

	bolt = Bolt.getInstance()
	gui = GlobalGui.getInstance();
	settings: { depth: { power: number; offset: number; featherA: number; featherB: number; } };

	constructor( { map, mapDepth }: { map: Texture2D, mapDepth: Texture2D } ) {

		const plane = new Plane( { widthSegments: 64, heightSegments: 64 } );

		const m = new Mesh( plane );

		const p = new Program( vertexShader, fragmentShader );

		p.activate();
		p.setTexture( "map", map );
		p.setTexture( "mapDepth", mapDepth );
		p.transparent = true;

		super( m, p );

		this.transform.scale = vec3.fromValues( 0.3, 0.3, 0.3 );

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
