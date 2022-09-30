#version 300 es

precision highp float;

out vec4 FragColor;

in vec2 Uv;
in vec3 Normal;
in vec4 ShadowCoord;
in vec3 FragPosition;
in vec3 Eye;
in float Fog;

uniform sampler2D mapDepth;
uniform sampler2D mapMatcapLight;
uniform sampler2D mapMatcapDark;
uniform float shadowStrength;
uniform float colorMode;
uniform vec3 lightPosition;

float getShadow( vec4 shadowCoord, vec3 lightDirection )
{
    vec3 projCoords = shadowCoord.xyz / shadowCoord.w;

    projCoords = projCoords * 0.5 + 0.5;

    if(projCoords.z < 0.0 || projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) {
        return 0.0;
    }

    float currentDepth = projCoords.z;

    float bias = 0.01;// max( 0.05 * ( 1.0 - dot( Normal, lightDirection ) ), 0.005 );

    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2( textureSize( mapDepth, 0 ) );

    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture( mapDepth, projCoords.xy + vec2( x, y ) * texelSize ).r;
            shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
        }
    }

    shadow /= 9.0;

    return shadow;
}

vec2 getReflection( vec3 Eye, vec3 Normal ) {

    vec3 reflected = reflect(Eye, normalize(Normal));

    float m = 2. * sqrt(pow(reflected.x, 2.) + pow(reflected.y, 2.) + pow(reflected.z + 1., 2.));
    vec2 vN = reflected.xy / m + .5;

    return vN;

}

void main() {


    vec2 uv = gl_PointCoord.xy;
    uv.y = 1.0 - uv.y;

    float sdf = 1.0 - step( 0.5, length(uv - vec2(0.5)) );
    if(sdf == 0.0) discard;

    vec3  lightDirection = ( lightPosition - FragPosition );
    float shadow         = getShadow( ShadowCoord, normalize( lightDirection ) );
    vec3  colorLight     = texture( mapMatcapLight, getReflection( Eye, Normal ) ).rgb;
    vec3  colorDark      = texture( mapMatcapDark, getReflection( Eye, Normal ) ).rgb;

    vec3 color = mix( colorLight, colorDark, colorMode );
    //color *= 1.0 - ( shadow * shadowStrength );

    FragColor = vec4( colorLight, 1.0);

    //FragColor = vec4( vec3( sdf ), 1.0 );

}