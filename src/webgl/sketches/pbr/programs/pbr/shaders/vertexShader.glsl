#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 normal;
uniform mat4 modelView;
uniform mat4 modelViewInverse;

uniform vec3 cameraPosition;

out vec2 Uv;

out vec3 Normal;
out vec3 ViewPosition;
out vec3 WorldPosition;
out vec3 Eye;
out vec3 WorldNormal;


void main() {

	vec3 position 			= aPosition;
	vec3 worldSpacePosition	= ( model * vec4( position, 1.0 ) ).xyz;

	// get the world space normal
	Normal						= ( normal * vec4( aNormal, 0.0 ) ).xyz;
	WorldPosition				= worldSpacePosition;

	Eye				= normalize( cameraPosition - worldSpacePosition);
	WorldNormal				= ( model * vec4( aNormal, 0.0 ) ).xyz;

	gl_Position				= projection * modelView * vec4( aPosition, 1.0 );

	Uv			= aUv;
}