import { quat, vec3, vec4 } from "gl-matrix";
import { Channel, KeyFrame } from "../gltf-loader";

export default class BakedAnimation {
  private _channels: Channel;
  private _currentAnimation: KeyFrame;
  private _animationTime = 0;
  private _minTime: number;
  private _maxTime: number;

  constructor(channels: Channel) {
    this._channels = channels;

    this.runAnimation("ArmatureAction");

    const translations = Object.values(this._currentAnimation).map(
      ({ translation }) => translation
    );

    const flattened = [].concat(...translations);

    // find min time and max by object time properties
    this._minTime = Math.min(...flattened.map(({ time }) => time));
    this._maxTime = Math.max(...flattened.map(({ time }) => time));
  }

  runAnimation(animationName: string) {
    this._animationTime = 0;
    this._currentAnimation = this._channels[animationName];
  }

  update(elapsed, delta) {
    this._animationTime += delta;

    if (this._animationTime > this._maxTime) {
      this._animationTime = this._minTime;
    }

    Object.values(this._currentAnimation).forEach((transformData) => {
      const translation = transformData.translation as KeyFrame[];
      const rotation = transformData.rotation as KeyFrame[];
      const scale = transformData.scale as KeyFrame[];

      // get the previous and next keyframes for each transform
      const translationTransform = this._getPrevAndNextKeyFrames(
        translation,
        this._animationTime
      );

      const rotationTransform = this._getPrevAndNextKeyFrames(
        rotation,
        this._animationTime
      );

      const scaleTransform = this._getPrevAndNextKeyFrames(
        scale,
        this._animationTime
      );
    });
  }

  _cubicSplineInterpolate(
    t: number,
    prevVal: vec3 | vec4 | quat,
    prevTan: vec3 | vec4 | quat,
    nextTan: vec3 | vec4 | quat,
    nextVal: vec3 | vec4 | quat
  ): vec3 | vec4 | quat {
    const t2 = t * t;
    const t3 = t2 * t;

    const s2 = 3 * t2 - 2 * t3;
    const s3 = t3 - t2;
    const s0 = 1 - s2;
    const s1 = s3 - t2 + t;

    for (let i = 0; i < prevVal.length; i++) {
      prevVal[i] =
        s0 * prevVal[i] +
        s1 * (1 - t) * prevTan[i] +
        s2 * nextVal[i] +
        s3 * t * nextTan[i];
    }

    return prevVal;
  }

  _getPrevAndNextKeyFrames(
    keyframes: KeyFrame[],
    time: number
  ): { prevKeyFrame: KeyFrame; nextKeyFrame: KeyFrame } {
    const prevKeyFrame = keyframes.find(({ time: t }) => t <= time);
    const nextKeyFrame = keyframes.find(({ time: t }) => t >= time);

    return { prevKeyFrame, nextKeyFrame };
  }
}
