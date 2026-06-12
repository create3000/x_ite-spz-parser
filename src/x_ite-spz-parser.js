const X3D = window [Symbol .for ("X_ITE.X3D")];

const
   ANTIALIASED_FLAG = 1,
   COLOR_SCALE      = 0.15;

/*
 * Parser
 */

class SPZParser extends X3D .X3DParser
{
   constructor (scene)
   {
      super (scene);

      this .offset = 0;
   }

   getEncoding ()
   {
      return "ARRAY_BUFFER";
   }

   setInput (buffer)
   {
      this .buffer   = buffer;
      this .dataView = new DataView (buffer);
      this .header   = this .parseHeader ();
   }

   isValid ()
   {
      const { magic, version, shDegree } = this .header;

      // Check magic.

      if (magic !== 0x5053474e)
         return false;

      // Validate header.

      if (version < 1 || version > 2)
         return false;

      if (shDegree > 3)
         return false;

      return true;
   }

   parseIntoScene (resolve, reject)
   {
      this .spz ()
         .then (resolve)
         .catch (reject);
   }

   async spz ()
   {
      const
         browser = this .getBrowser (),
         scene   = this .getScene ();

      scene .setEncoding ("SPZ");
      scene .setProfile (browser .getProfile ("Interchange"));
      scene .addComponent (browser .getComponent ("X_ITE"));

      await this .getBrowser () .loadComponents (scene);

      const
         gaussianSplats = scene .createNode ("GaussianSplats"),
         splats         = this .parseSplats ();

      console .log (splats);

      scene .rootNodes .push (gaussianSplats);

      return scene;
   }

   parseHeader ()
   {
      const { dataView } = this;

      const header = {
         magic: dataView .getUint32 (this .offset, true),
         version: dataView .getUint32 (this .offset += 4, true),
         numPoints: dataView .getUint32 (this .offset += 4, true),
         shDegree: dataView .getUint8 (this .offset += 4),
         fractionalBits: dataView .getUint8 (this .offset += 1),
         flags: dataView .getUint8 (this .offset += 1),
         reserved: dataView .getUint8 (this .offset += 1),
      };

      this .offset += 1;

      return header;
   }

   parseSplats ()
   {
      const { version, numPoints, shDegree, fractionalBits, flags } = this .header;

      const
         shDimension = this .dimForDegree (shDegree),
         usesFloat16 = version === 1;

      // Initialize packed object.

      const packed = {
         numPoints,
         shDegree,
         fractionalBits,
         antialiased: (flags & ANTIALIASED_FLAG) !== 0,
         numPositions: numPoints * 3 * (usesFloat16 ? 2 : 3),
         numRotations: numPoints * 3,
         numScales: numPoints * 3,
         numOpacities: numPoints,
         numColors: numPoints * 3,
         numSh: numPoints * shDimension * 3,
      };

      // Read data sections.

      const array = new Uint8Array (this .buffer);

      let currentOffset = this .offset;

      packed .positions = array .subarray (currentOffset, currentOffset += packed .numPositions);
      packed .opacities = array .subarray (currentOffset, currentOffset += packed .numOpacities);
      packed .colors    = array .subarray (currentOffset, currentOffset += packed .numColors);
      packed .scales    = array .subarray (currentOffset, currentOffset += packed .numScales);
      packed .rotations = array .subarray (currentOffset, currentOffset += packed .numRotations);
      packed .sh        = array .subarray (currentOffset, currentOffset += packed .numSh);

      // Verify we read the expected amount of data.

      if (currentOffset !== this .buffer .byteLength)
         throw new Error ("x_ite-spz-parser: incorrect buffer size.");

      return this .unpackSplats (packed);
   }

   unpackSplats (packed)
   {
      const { numPoints, positions, rotations, scales, colors, shDegree } = packed;
      const shDimension = this .dimForDegree (shDegree);
      const usesFloat16 = positions .length === numPoints * 3 * 2;

      // Validate sizes
      if (!this .checkSizes2 (packed, numPoints, shDimension, usesFloat16))
         throw new Error ("x_ite-spz-parser: incorrect array sizes.");

      const splat = {
         position: [ ],
         scale: [ ],
         rotation: [ ],
         color: [ ],
         sh: [ ]
      };

      const
         splatPositions    = [ ],
         splatOrientations = [ ],
         splatScales       = [ ],
         splatOpacities    = [ ],
         splatColors       = [ ];

      let halfData;

      if (usesFloat16)
         halfData = new Uint16Array (positions .buffer, positions .byteOffset, numPoints * 3);

      const
         fullPrecisionPositionScale = 1 / (1 << packed .fractionalBits),
         shCoefPerChannelPerSplat   = this .dimForDegree (packed .shDegree);

      for (let i = 0; i < numPoints; ++ i)
      {
         // Splat position.
         if (usesFloat16)
         {
            // Decode legacy float16 format.
            for (let j = 0; j < 3; ++ j)
               splatPositions .push (this .halfToFloat (halfData [i * 3 + j]));
         }
         else
         {
            // Decode 24-bit fixed point coordinates.

            for (let j = 0; j < 3; ++ j)
            {
               const base = i * 9 + j * 3;

               let fixed32 = positions [base];

               fixed32 |= positions [base + 1] << 8;
               fixed32 |= positions [base + 2] << 16;
               fixed32 |= (fixed32 & 0x800000) ? 0xff000000 : 0;

               splatPositions .push (fixed32 * fullPrecisionPositionScale);
            }
         }

         // Splat scale
         for (let j = 0; j < 3; ++ j)
            splatScales .push (Math .exp (scales [i * 3 + j] / 16 - 10));

         // Splat rotation
         const r = rotations .subarray (i * 3, i * 3 + 3);

         const xyz = [
            r [0] / 127.5 - 1,
            r [1] / 127.5 - 1,
            r [2] / 127.5 - 1,
         ];

         splatOrientations .push (xyz [0]);
         splatOrientations .push (xyz [1]);
         splatOrientations .push (xyz [2]);

         const squaredNorm = Math .hypot (xyz [0], xyz [1], xyz [2]);

         splatOrientations .push (Math .sqrt (Math .max (0, 1 - squaredNorm)));

         // Splat opacity
         // splat .opacity = invSigmoid (packed .opacities [i] / 255);
         splatOpacities .push (Math .floor (packed .opacities [i]) / 255);

         // Splat color
         for (let j = 0; j < 3; ++ j)
         {
            splatColors .push (Math .floor (((colors [i * 3 + j] / 255) - 0.5) / COLOR_SCALE));
         }

         // // Splat spherical harmonics
         // for (let j = 0; j < 3; ++ j)
         // {
         //    for (let k = 0; k < shCoefPerChannelPerSplat; k++)
         //    {
         //       splat .sh [j * shCoefPerChannelPerSplat + k] = this .unquantizeSH (sh [shCoefPerChannelPerSplat * 3 * i + k * 3 + j]);
         //    }
         // }
      }

      return {
         positions: splatPositions,
         orientations: splatOrientations,
         scales: splatScales,
         opacities: splatOpacities,
         colors: splatColors,
      };
   }

   // Helper function to check sizes (matching C++ checkSizes function)
   checkSizes2 (packed, numPoints, shDimension, usesFloat16)
   {
      if (packed .positions .length !== numPoints * 3 * (usesFloat16 ? 2 : 3))
         return false;

      if (packed .scales .length !== numPoints * 3)
         return false;

      if (packed .rotations .length !== numPoints * 3)
         return false;

      if (packed .opacities .length !== numPoints)
         return false;

      if (packed .colors .length !== numPoints * 3)
         return false;

      if (packed .sh .length !== numPoints * shDimension * 3)
         return false;

      return true;
   }

   halfToFloat (h)
   {
      const sgn = (h >> 15) & 0x1;
      const exponent = (h >> 10) & 0x1f;
      const mantissa = h & 0x3ff;

      const signMul = sgn === 1 ? -1 : 1;
      if (exponent === 0) {
         return signMul * Math.pow(2, -14) * mantissa / 1024;
      }

      if (exponent === 31) {
         return mantissa !== 0 ? NaN : signMul * Infinity;
      }

      return signMul * Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
   }

   unquantizeSH (x)
   {
      return (x - 128) / 128;
   }

   dimForDegree (degree)
   {
      switch (degree)
      {
         case 0: return 0;
         case 1: return 3;
         case 2: return 8;
         case 3: return 15;
      }
   }
}

X3D .GoldenGate .addParsers (SPZParser);
