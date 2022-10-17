
import Example from "@/webgl/sketches/particle-forms";

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
