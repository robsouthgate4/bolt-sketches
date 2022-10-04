
import Example from "@/webgl/sketches/particle-glitter";

export default class Main {

	loading: boolean;

	constructor() {

		this.loading = false;

	}

	_start() {

		const example = new Example();
		example.start();

	}

}
