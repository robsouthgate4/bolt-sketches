
import Example from "@/webgl/sketches/particle-flakes";

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
