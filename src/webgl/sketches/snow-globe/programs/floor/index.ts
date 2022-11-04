import Bolt, { ONE_MINUS_SRC_ALPHA, Program, SRC_ALPHA } from "@/webgl/libs/bolt";

import vertexShader from "./shaders/vertexShader.glsl";
import fragmentShader from "./shaders/fragmentShader.glsl";
import EventListeners from "@/webgl/modules/event-listeners";
import { GL_UPDATE_TOPIC } from "@/webgl/modules/event-listeners/constants";

export default class FloorProgram extends Program {

	bolt = Bolt.getInstance();
	eventListeners = EventListeners.getInstance();

	constructor() {

		super( vertexShader, fragmentShader );
		this.blendFunction = { src: SRC_ALPHA, dst: ONE_MINUS_SRC_ALPHA };
		this.eventListeners.listen( GL_UPDATE_TOPIC, this.render.bind( this ) );

	}

	render() {

		this.activate();
		this.setVector3( "cameraPosition", this.bolt.camera.transform.position );

	}


}
