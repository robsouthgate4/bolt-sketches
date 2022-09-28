import { vec2, vec3, vec4 } from "gl-matrix";

import { isTouchDevice } from "@/webgl/globals/constants";
import {
	GL_WHEEL_TOPIC,
	GL_TOUCH_END_TOPIC,
	GL_TOUCH_MOVE_TOPIC,
	GL_TOUCH_START_TOPIC,
	GL_RESIZE_TOPIC,
	GL_KEYDOWN_TOPIC,
	GL_KEYUP_TOPIC,
} from "./constants";

export interface ITouchEvent {
	normalized: {
		x: number;
		y: number;
	};
	raw: {
		x: number;
		y: number;
	};
	rawNormalized: {
		x: number;
		y: number;
	};
}

export interface IUpdateEvent {
	elapsed: number;
	delta: number;
}
export interface IValue {
	value: number | string | boolean | vec2 | vec3 | vec4;
}

export type GenericEventData = CustomEvent<IValue>;
export type TouchEventData = CustomEvent<ITouchEvent>;
export type UpdateEventData = CustomEvent<IUpdateEvent>;

export default class EventListeners {
	static instance: EventListeners;

	private _width: number;
	private _height: number;
	private _mouse: ITouchEvent | null;
	private _touch?: ITouchEvent | null;
	private _target = new EventTarget();

	constructor() {
		this._mouse = null;
		this._touch = null;
		this._width = window.innerWidth;
		this._height = window.innerHeight;
		this._createListeners();
	}

	static getInstance() {
		if (!EventListeners.instance) EventListeners.instance = new this();
		return EventListeners.instance;
	}

	_createListeners() {
		window.addEventListener("resize", this.onResize.bind(this));
		if (isTouchDevice()) {
			window.addEventListener("touchstart", this.onTouch.bind(this));
			window.addEventListener("touchend", this.onTouchEnd.bind(this));
			window.addEventListener("touchmove", this.onTouchMove.bind(this));
		} else {
			window.addEventListener("mousedown", this.onMouse.bind(this));
			window.addEventListener("mouseup", this.onMouseEnd.bind(this));
			window.addEventListener("mousemove", this.onMouseMove.bind(this));
			window.addEventListener("wheel", this.onWheel.bind(this));
			window.addEventListener("keydown", this.onKeyDown.bind(this));
		}
	}

	onResize() {
		this._width = window.innerWidth;
		this._height = window.innerHeight;
		this.publish(GL_RESIZE_TOPIC, { width: this._width, height: this._height });
	}

	removeListeners() {
		window.removeEventListener("touchstart", this.onTouch.bind(this));
		window.removeEventListener("touchend", this.onTouchEnd.bind(this));
		window.removeEventListener("touchmove", this.onTouchMove.bind(this));
		window.removeEventListener("mousedown", this.onMouse.bind(this));
		window.removeEventListener("mouseup", this.onMouseEnd.bind(this));
		window.removeEventListener("mousemove", this.onMouseMove.bind(this));
		window.removeEventListener("wheel", this.onWheel.bind(this));
		window.removeEventListener("keydown", this.onKeyDown.bind(this));
		window.removeEventListener("keyup", this.onKeyUp.bind(this));
	}

	onMouse(ev: MouseEvent) {
		this._mouse = this.getMouse(ev);
		this.publish(GL_TOUCH_START_TOPIC, this._mouse);
	}

	onKeyDown(ev: KeyboardEvent) {
		this.publish(GL_KEYDOWN_TOPIC, ev);
	}

	onKeyUp(ev: KeyboardEvent) {
		this.publish(GL_KEYUP_TOPIC, ev);
	}

	onMouseEnd(ev: MouseEvent) {
		this._mouse = this.getMouse(ev);
		this.publish(GL_TOUCH_END_TOPIC, this._mouse);
	}

	onTouch(ev: TouchEvent) {
		this._touch = this.getTouch(ev);
		this.publish(GL_TOUCH_START_TOPIC, this._touch);
	}

	onTouchEnd(ev: TouchEvent) {
		this._touch = this.getTouch(ev);
		this.publish(GL_TOUCH_END_TOPIC, this._touch);
	}

	onWheel(ev: WheelEvent) {
		this.publish(GL_WHEEL_TOPIC, ev);
	}

	onMouseMove(ev: MouseEvent) {
		ev.preventDefault();
		ev.stopPropagation();

		this._mouse = this.getMouse(ev);
		this.publish(GL_TOUCH_MOVE_TOPIC, this._mouse);
	}

	onTouchMove(ev: TouchEvent) {
		if (ev.touches) {
			if (ev.touches.length > 1) {
				return;
			}
		}

		ev.preventDefault();
		ev.stopPropagation();

		this._touch = this.getTouch(ev);
		if (!this._touch) return;
		this.publish(GL_TOUCH_MOVE_TOPIC, this._touch);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	publish(topic: string, detail?: any) {
		if (!this._target) return;
		this._target.dispatchEvent(new CustomEvent(topic, { detail }));
		return this._target;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	listen(topic: string, callback: (event: any) => void) {
		if (!this._target) return;
		this._target.addEventListener(topic, callback as EventListener);
		return this._target;
	}

	getTouch(ev: TouchEvent) {
		if (!ev.changedTouches.length) return;
		const event = ev.changedTouches[0];
		return {
			normalized: {
				x: (event.clientX / this._width) * 2 - 1,
				y: -(event.clientY / this._height) * 2 + 1,
			},
			raw: {
				x: event.clientX,
				y: event.clientY,
			},
			rawNormalized: {
				x: (event.clientX - this._width * 0.5) * 2,
				y: (event.clientY - this._height * 0.5) * 2,
			},
		};
	}

	getMouse(ev: MouseEvent) {
		return {
			normalized: {
				x: (ev.clientX / this._width) * 2 - 1,
				y: -(ev.clientY / this._height) * 2 + 1,
			},
			raw: {
				x: ev.clientX,
				y: ev.clientY,
			},
			rawNormalized: {
				x: (ev.clientX - this._width * 0.5) * 2,
				y: (ev.clientY - this._height * 0.5) * 2,
			},
		};
	}

	public get target() {
		return this._target;
	}
	public set target(value) {
		this._target = value;
	}
}
