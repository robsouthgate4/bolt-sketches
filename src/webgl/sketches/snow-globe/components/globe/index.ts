import Bolt, { BACK, BoltParams, Camera, DrawSet, Mesh, ONE, ONE_MINUS_SRC_ALPHA, Program, Texture2D } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/basic/basic.vert";
import fragmentShader from "./shaders/basic/basic.frag";

export default class Globe extends DrawSet {

	bolt = Bolt.getInstance()

	constructor( { mesh, mapEnv }: { mesh: Mesh, mapEnv: Texture2D } ) {

		const p = new Program( vertexShader, fragmentShader );

		p.activate();
		p.setTexture( "mapEnv", mapEnv );
		p.cullFace = BACK;
		p.transparent = true;
		p.blendFunction = { src: ONE, dst: ONE_MINUS_SRC_ALPHA };

		super( mesh, p );

	}

	render() {

		this.program.activate();
		this.program.setVector3( "cameraPosition", this.bolt.camera.transform.position );

		this.bolt.draw( this );

	}


}
