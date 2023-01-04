import EaseNumber from "./EaseNumber";

class EaseVec3 {
  private _x: EaseNumber;
  private _y: EaseNumber;
  private _z: EaseNumber;

  constructor(x = 0, y = 0, z = 0, easing = 0.1) {
    this._x = new EaseNumber(x, easing);
    this._y = new EaseNumber(y, easing);
    this._z = new EaseNumber(z, easing);
  }

  setTo(x: number, y: number, z: number) {
    this._x.setTo(x);
    this._y.setTo(y);
    this._z.setTo(z);
  }

  set easing(value: number) {
    this._x.easing = value;
    this._y.easing = value;
    this._z.easing = value;
  }

  set x(value: number) {
    this._x.value = value;
  }

  get x() {
    return this._x.value;
  }

  set y(value: number) {
    this._y.value = value;
  }

  get y() {
    return this._y.value;
  }

  set z(value: number) {
    this._z.value = value;
  }

  get z() {
    return this._z.value;
  }
}

export default EaseVec3;
