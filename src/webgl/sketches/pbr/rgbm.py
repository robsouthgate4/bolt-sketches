#!/usr/bin/python
#coding:utf-8

# -- This line is 75 characters -------------------------------------------
"""
This script will convert a .HDR (radiance) into a RGBM file,
then save it back out as a 8bit (per-channel) .tga
"""
__author__ = 'HogJonny'
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
import os, sys
import math
import array
import numpy as np
import argparse
import OpenImageIO as oiio
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
# oiioImageObj
class oiioImageObj():
    """
    OpenImageIO file class
    ... reads a file (supports .HDR), this happens when you instanciate
    ... processes file to RGMB
    ... write file to .tga
    """
    #----------------------------------------------------------------------
    def __init__(self, inputPath, outputPath, useGamma, setExponent, outChannels=4):
        """Constructor"""
        self._inputPath = inputPath
        self._outputPath = outputPath
        self._useGamma = useGamma
        self._setExponent = setExponent

        pixels, type, width, height, channels, metadata = readPixelArray(inputPath)

        self._pixels = pixels
        self._type = type
        self._width = width
        self._height = height
        self._inChannels = channels
        self._outChannels = outChannels
        self._metadata = metadata

    #----------------------------------------------------------------------
    def processRGBM(self):
        # process the
        self._outRGBMpixelArray = processImage(self._pixels,
                                               self._width,
                                               self._height,
                                               self._inChannels,
                                               self._outChannels,
                                               self._useGamma,
                                               self._setExponent,
                                               self._metadata)
        return self._outRGBMpixelArray

    #----------------------------------------------------------------------
    def writeOuputImage(self):
        self._outImage = writeRGBMimage(self._outRGBMpixelArray,
                                        self._type,
                                        self._width,
                                        self._height,
                                        self._outChannels,
                                        self._metadata,
                                        self._outputPath)
        return self._outImage
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
# Read an image
def readPixelArray(inputPath):
    """Reads in a file using OpenImageIO"""
    print( "~ Loading Image ... IN Path : {0}".format(inputPath) )

    inputImage = oiio.ImageInput.open( inputPath )

    # get image specs
    inputImageSpec = inputImage.spec()
    type = inputImageSpec.format.basetype
    width = inputImageSpec.width
    height = inputImageSpec.height
    channels = inputImageSpec.nchannels
    metadata = inputImageSpec.extra_attribs
    metanames = [attr.name for attr in metadata]

    inPixels = inputImage.read_image(type)
    inPixels = np.frombuffer(np.getbuffer(np.float32(inPixels)), dtype=np.float32)
    inPixels = np.array(inPixels).reshape((width, height, channels))

    inputImage.close()

    return (inPixels, type, width, height, channels, metadata)
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
# processImage
def processImage(pixels, width, height,
                 inChannels, outChannels,
                 useGamma, setExponent, metadata):

    # Array to hold the processed version of the pixels
    outRGBMpixelArray = np.zeros((width, height, outChannels), dtype=np.float32)

    # Process array into RGBM
    print( "~ Filtering image ..." )
    for i in range(width):
        for j in range(height):
            ovalue = pixels[i][j]
            pvalue = list(ovalue)

            rgbmPixel = RGBMEncode(pvalue, useGamma, setExponent)

            #print ("~ processed {0},{1}: {2}, :: {3}\r"
            #       "".format(i, j, pvalue, rgbmPixel))

            outRGBMpixelArray[i][j] = rgbmPixel

    pixels8 = np.zeros((width, height, outChannels), dtype=np.uint8)
    for i in range(width):
        for j in range(height):
            for k in range(outChannels):
                pixels8[i][j][k] = int(outRGBMpixelArray[i][j][k])

    return pixels8
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
def writeRGBMimage(pixels, type, width, height, channels, metadata, outputPath):
    """Write the image file back to disk using output path"""
    print( "~ Writing Image ... OUT Path : {0}".format(outputPath) )

    # set image specs
    outputSpec = oiio.ImageSpec()
    #outputSpec.set_format( oiio.FLOAT )
    #outputSpec.set_format( oiio.UINT16 )
    outputSpec.set_format( oiio.UINT8 )
    #outputSpec.set_format( type )
    outputSpec.width = width
    outputSpec.height = height
    outputSpec.nchannels = channels

    metanames = [attr.name for attr in metadata]

    # Add the metadata tags
    for attr in metadata:
        value = attr.value
        print("~ attr.name={0}, attr.value={1}, attr.type{2}\r"
              "".format(attr.name, attr.value, str(attr.type) ) )

        outputSpec.attribute( attr.name, attr.type, value )

    outputImage = oiio.ImageOutput.create(outputPath)
    outputImage.open(outputPath, outputSpec, oiio.Create)

    try:
        outputImage.write_image(outputSpec.format, pixels)
    except Exception as e:
        print(e)

    outputImage.close()

    return outputImage

# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
# function to clamp float
def saturate(num, floats=True):
    """Implements saturate"""
    if num < 0:
        num = 0
    elif num > (1 if floats else 255):
        num = (1 if floats else 255)
    return num
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
# RGBMEncode
def RGBMEncode(color, useGamma=True, exp=6.0):
    """
    Implements conversion of color(RGB) to RGBM(RGBA)
    the expoent used in the conversion defaults to 6.0(float)
    """
    rgbm = [0.0, 0.0, 0.0, 0.0];

    expRange = 1.0 / exp;
    gamma = 1.0/2.23333333

    if useGamma:
        # linear --> gamma
        color[0] = pow(color[0], gamma) * expRange;
        color[1] = pow(color[1], gamma) * expRange;
        color[2] = pow(color[2], gamma) * expRange;

    # encode
    maxRGB = max( color[0], max( color[1], color[2]));

    rgbm[3] = math.ceil( maxRGB * 255.0 ) / 255.0;

    rgbm[0] = round( 255.0 * min(color[0] / rgbm[3], 1.0));
    rgbm[1] = round( 255.0 * min(color[1] / rgbm[3], 1.0));
    rgbm[2] = round( 255.0 * min(color[2] / rgbm[3], 1.0));
    rgbm[3] = round( 255.0 * min(rgbm[3], 1.0));

    return rgbm
# -------------------------------------------------------------------------


# -------------------------------------------------------------------------
def main(args):
    """
    Main loop to run conversion from input HDR > RGBM image output
    """

    inputImageObj = oiioImageObj(args.input,
                                 args.output,
                                 args.gammaCorrect,
                                 args.setExponent)

    print("~ Input Image ... IN Path: {0}".format(inputImageObj._inputPath))
    print("~ Output Image ... OUT Path: {0}".format(inputImageObj._outputPath))
    print("~ Input Image ... width: {0}".format(inputImageObj._width))
    print("~ Input Image ... height: {0}".format(inputImageObj._height))
    print("~ Input Image ... channels: {0}".format(inputImageObj._inChannels))

    inputImageObj.processRGBM()
    inputImageObj.writeOuputImage()

    return inputImageObj


###########################################################################
## Main Code Block, runs this script as main (from commandline)
# -------------------------------------------------------------------------
if __name__ == '__main__':
    description='Convert HDR --> RGBM'
    parser = argparse.ArgumentParser(description)

    parser.add_argument("-i",
                        "--input",
                        default=None,
                        help="INput image filepath",
                        required=True)

    parser.add_argument("-o",
                        "--output",
                        default=None,
                        help="OUTput image filepath",
                        required=True)

    parser.add_argument("-g",
                        "--gammaCorrect",
                        default=True,
                        help="corrects gamma for output",
                        required=False)

    parser.add_argument("-exp",
                        "--setExponent",
                        default=6.0,
                        help="user can set exponent",
                        required=False)

    args = parser.parse_args()

    main(args)