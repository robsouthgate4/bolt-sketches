// Easing helper by Yi Wen Lin https://github.com/yiwenl

class EaseNumber {
  public easing: number;
  private _value: number;
  private _targetValue: number;
  private _efIndex!: number;
  private _min = -99999;
  private _max = 99999;

  constructor(startValue = 0, easing = 0.1) {
    this.easing = easing;
    this._value = startValue;
    this._targetValue = startValue;
    this._update();
  }

  _update() {
    const MIN_DIFF = 0.0001;
    this._checkLimit();
    this._value += (this._targetValue - this._value) * this.easing;
    if (Math.abs(this._targetValue - this._value) < MIN_DIFF) {
      this._value = this._targetValue;
    }

    this._efIndex = window.requestAnimationFrame(this._update.bind(this));
  }

  setTo(value: number) {
    this._targetValue = this._value = value;
  }

  add(add: number) {
    this._targetValue += add;
  }

  limit(min: number, max: number) {
    if (min > max) {
      this.limit(max, min);
      return;
    }

    this._min = min;
    this._max = max;

    this._checkLimit();
  }

  _checkLimit() {
    if (this._min !== undefined && this._targetValue < this._min) {
      this._targetValue = this._min;
    }

    if (this._max !== undefined && this._targetValue > this._max) {
      this._targetValue = this._max;
    }
  }

  destroy() {
    window.cancelAnimationFrame(this._efIndex);
  }

  set value(value) {
    this._targetValue = value;
  }

  get value() {
    return this._value;
  }

  get targetValue() {
    return this._targetValue;
  }
}

export default EaseNumber;
