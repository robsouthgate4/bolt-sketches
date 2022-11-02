export const GL_RESIZE_TOPIC = "GL_RESIZE_TOPIC";

export const GL_EARLY_UPDATE_TOPIC = "GL_EARLY_UPDATE_TOPIC";
export const GL_UPDATE_TOPIC = "GL_UPDATE_TOPIC";
export const GL_LATE_UPDATE_TOPIC = "GL_LATE_UPDATE_TOPIC";

export const GL_TOUCH_MOVE_TOPIC = "GL_TOUCH_MOVE_TOPIC";
export const GL_TOUCH_END_TOPIC = "GL_TOUCH_END_TOPIC";
export const GL_TOUCH_START_TOPIC = "GL_TOUCH_START_TOPIC";
export const GL_WHEEL_TOPIC = "GL_WHEEL_TOPIC";
export const GL_KEYDOWN_TOPIC = "GL_KEYDOWN_TOPIC";
export const GL_KEYUP_TOPIC = "GL_KEYUP_TOPIC";

export const isTouchDevice = () => {

	return navigator
	  ? "ontouchstart" in window ||
	  // @ts-ignore-disable-next-line
	  ( window.DocumentTouch && document instanceof window.DocumentTouch ) ||
	  navigator.maxTouchPoints ||
	  false
	  : false;

};
