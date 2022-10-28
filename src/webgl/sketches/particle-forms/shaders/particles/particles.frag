#version 300 es

precision highp float;

out vec4 FragColor;

in vec2 Uv;
in vec3 Normal;
in vec4 ShadowCoord;
in vec3 FragPosition;
in vec3 Eye;
in vec3 Random;
in float Fog;
in float Group;

uniform sampler2D mapDepth;
uniform sampler2D mapMatcapLight;
uniform sampler2D mapMatcapDark;
uniform float shadowStrength;
uniform float colorMode;
uniform vec3 lightPosition;


vec2 getReflection( vec3 Eye, vec3 Normal ) {

    vec3 reflected = reflect(Eye, normalize(Normal));

    float m = 2. * sqrt(pow(reflected.x, 2.) + pow(reflected.y, 2.) + pow(reflected.z + 1., 2.));
    vec2 vN = reflected.xy / m + .5;

    return vN;

}

void main() {


    vec2 uv = gl_PointCoord.xy;
    uv.y = 1.0 - uv.y;

    float sdf = 1.0 - step( 0.5, length( uv - vec2( 0.5 )) );
    if(sdf == 0.0) discard;

    vec3  lightDirection = ( lightPosition - FragPosition );
    vec3  colorLight     = texture( mapMatcapLight, getReflection( Eye, Normal ) ).rgb;
    vec3  colorDark      = texture( mapMatcapLight, getReflection( Eye, Normal ) ).rgb;

    colorDark.b *= 1.5;
    colorDark.r *= 0.2;
    colorDark.g *= 1.2;

    colorDark *= 0.3;

    vec3 color = vec3( 1.0 );

    FragColor = vec4( color, 1.0 );

}