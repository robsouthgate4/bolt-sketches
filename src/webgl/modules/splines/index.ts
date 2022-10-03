import { vec3 } from "gl-matrix";

// catmull-rom spline interpolation TODO: split to scalars that can combine to vectors
export const catmullRomInterpolation = (p0: vec3, p1: vec3, p2: vec3, p3: vec3, t: number): vec3 => {

	// vec2 m1 = (1.0f - tension) *
	// 	(p2 - p1 + t12 * ((p1 - p0) / t01 - (p2 - p0) / (t01 + t12)));

	// vec2 m2 = (1.0f - tension) *
	// 	(p2 - p1 + t12 * ((p3 - p2) / t23 - (p3 - p1) / (t12 + t23)));

	// vec2 a = 2.0f * (p1 - p2) + m1 + m2;
	// vec2 b = -3.0f * (p1 - p2) - m1 - m1 - m2;
	// vec2 c = m1;
	// vec2 d = p1;

	const alpha = 1.0;
	const tension = 0.0;

	const t01 = Math.pow(vec3.distance(p0, p1), alpha);
	const t12 = Math.pow(vec3.distance(p1, p2), alpha);
	const t23 = Math.pow(vec3.distance(p2, p3), alpha);

	const m1 = vec3.create();
	m1[0] = (1 - tension) * (p2[0] - p1[0] + t12 * ((p1[0] - p0[0]) / t01 - (p2[0] - p0[0]) / (t01 + t12)));
	m1[1] = (1 - tension) * (p2[1] - p1[1] + t12 * ((p1[1] - p0[1]) / t01 - (p2[1] - p0[1]) / (t01 + t12)));
	m1[2] = (1 - tension) * (p2[2] - p1[2] + t12 * ((p1[2] - p0[2]) / t01 - (p2[2] - p0[2]) / (t01 + t12)));

	const m2 = vec3.create();
	m2[0] = (1 - tension) * (p2[0] - p1[0] + t12 * ((p3[0] - p2[0]) / t23 - (p3[0] - p1[0]) / (t12 + t23)));
	m2[1] = (1 - tension) * (p2[1] - p1[1] + t12 * ((p3[1] - p2[1]) / t23 - (p3[1] - p1[1]) / (t12 + t23)));
	m2[2] = (1 - tension) * (p2[2] - p1[2] + t12 * ((p3[2] - p2[2]) / t23 - (p3[2] - p1[2]) / (t12 + t23)));

	const a = vec3.create();
	a[0] = 2 * (p1[0] - p2[0]) + m1[0] + m2[0]
	a[1] = 2 * (p1[1] - p2[1]) + m1[1] + m2[1]
	a[2] = 2 * (p1[2] - p2[2]) + m1[2] + m2[2]

	const b = vec3.create();
	b[0] = -3 * (p1[0] - p2[0]) - m1[0] - m1[0] - m2[0];
	b[1] = -3 * (p1[1] - p2[1]) - m1[1] - m1[1] - m2[1];
	b[2] = -3 * (p1[2] - p2[2]) - m1[2] - m1[2] - m2[2];

	const c = m1;
	const d = p1;

	const out = vec3.create();

	vec3.copy(out, a);
	vec3.scale(out, out, t * t * t);
	vec3.add(out, out, vec3.scale(vec3.create(), b, t * t));
	vec3.add(out, out, vec3.scale(vec3.create(), c, t));
	vec3.add(out, out, d);

	return out;

}