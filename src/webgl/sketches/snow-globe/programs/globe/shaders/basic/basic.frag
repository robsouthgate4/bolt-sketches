#version 300 es

precision highp float;

uniform sampler2D mapEnv;
uniform sampler2D mapInner;
uniform vec2 resolution;
uniform float ior;

in vec2 Uv;
in vec3 Normal;
in vec3 VNormal;
in vec3 ViewVector;
in vec3 ViewVectorCenter;
in vec3 Eye;

#define PI 3.141592

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

// create rotation matrix around axis
mat3 rotationMatrix(vec3 axis, float angle) {
	axis = normalize(axis);
	float s = sin(angle);
	float c = cos(angle);
	float oc = 1.0 - c;

	return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
		oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
		oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

void main() {


	vec2 screenUV = gl_FragCoord.xy / resolution;

	float exposure = 0.05;

	vec3 v = ViewVector;

	//v = normalize(v);

	// create fresnel
	float fresnel = pow( clamp( 1. - dot( normalize( Normal ), -normalize( v ) ), 0., 1.), 0.75);

	vec3 reflectVec = normalize(reflect(v, Normal));

	vec2 uv = vec2(atan(reflectVec.z, reflectVec.x), asin(reflectVec.y)) / vec2(2.0 * PI, PI) + 0.5;

	float gamma = 2.2;
    vec3 hdrColor = texture(mapEnv, uv).rgb;

     // exposure tone mapping
    vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);

    // gamma correction
    mapped = pow(mapped, vec3(1.0 / gamma));

	mapped += fresnel * 0.01;

	vec4 reflections = vec4( mapped * fresnel, 0.2 * fresnel ).rgba;

	// get refraction vector
	vec3 refractVec = refract( normalize( ViewVectorCenter ), normalize( VNormal ) * 50., 1.0 / ior );

	float innerR = texture(mapInner, screenUV + ( refractVec.xy * 0.058 ) ).r;
	float innerG = texture(mapInner, screenUV + ( refractVec.xy * 0.054 ) ).g;
	float innerB = texture(mapInner, screenUV + ( refractVec.xy * 0.05 ) ).b;

	vec4 inner = vec4( innerR, innerG, innerB, 1.0 );


	FragColor = mix( inner, reflections, fresnel );


}