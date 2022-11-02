#version 300 es

precision highp float;

uniform sampler2D mapEnv;

in vec2 Uv;
in vec3 Normal;
in vec3 ViewVector;

out vec4 FragColor;

float blendLighten(float base, float blend) {
	return max(blend,base);
}

vec3 blendLighten(vec3 base, vec3 blend) {
	return vec3(blendLighten(base.r,blend.r),blendLighten(base.g,blend.g),blendLighten(base.b,blend.b));
}

vec3 blendLighten(vec3 base, vec3 blend, float opacity) {
	return (blendLighten(base, blend) * opacity + base * (1.0 - opacity));
}


void main() {

	float exposure = 0.5;

	vec3 reflectVec = normalize(reflect(ViewVector, Normal));

	// get equirectangular coordinates from world normal
	vec2 uv = vec2(atan(reflectVec.z, reflectVec.x), asin(reflectVec.y)) / vec2(2.0 * 3.14159265359, 3.14159265359) + 0.5;

	//uv.y = 1.0 - uv.y;

	float gamma = 2.2;
    vec3 hdrColor = texture(mapEnv, uv).rgb;

     // exposure tone mapping
    vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);

    // gamma correction
    mapped = pow(mapped, vec3(1.0 / gamma));

	//mapped = blendLighten(mapped, vec3(1.0, 0.0, 0.0), 0.9);

	FragColor = vec4( mapped, 0.2 );

}