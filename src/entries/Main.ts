import Example from "@/webgl/sketches/baked-animation";
import { EventListeners, GL_RESIZE_TOPIC } from "@bolt-webgl/core";

export default class Main {
  _loading: boolean;
  _eventListeners = EventListeners.getInstance();
  _example: Example;

  constructor() {
    this._loading = false;

    this._eventListeners.listen(GL_RESIZE_TOPIC, this._resize.bind(this));
  }

  _resize() {
    console.log("resize");
    if (!this._example) return;
    this._example.resize();
  }

  _start() {
    this._example = new Example();
    this._example.start();
  }
}
