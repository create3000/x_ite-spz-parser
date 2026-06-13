import { default as createSpzModule4 } from "./spz-3.0.0/spz.js";

const X3D = window [Symbol .for ("X_ITE.X3D")];

const
   ANTIALIASED_FLAG = 1,
   COLOR_SCALE      = 0.15;

/*
 * Parser
 */

// https://github.com/mkkellogg/GaussianSplats3D/blob/main/src/loaders/spz/SpzLoader.js

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
      const { magic, version } = this .header;

      // Check magic.

      if (magic !== 0x5053474e)
         return false;

      // Validate header.

      switch (version)
      {
         case 1:
         case 2:
         case 4:
            break;
         default:
            return false;
      }

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
         version        = this .header .version,
         gaussianSplats = scene .createNode ("GaussianSplats"),
         gaussianCloud  = await this .parseSplats ();

      gaussianSplats .positions    = gaussianCloud .positions;
      gaussianSplats .orientations = gaussianCloud .rotations;
      gaussianSplats .scales       = gaussianCloud .scales .map (value => Math .exp (value));
      gaussianSplats .opacities    = gaussianCloud .alphas .map (value => 1 / (1 + Math .exp (-value)));

      gaussianSplats .sphericalHarmonicsDegree0Coef0 = gaussianCloud .colors;

      // Set spherical harmonics.

      const
         numPoints                 = gaussianCloud .numPoints,
         shs                       = gaussianCloud .sh,
         shDegree                  =gaussianCloud .shDegree,
         shCoefPerChannelPerSplat3 = this .dimForDegree (shDegree) * 3,
         splatShs                  = Array .from ({ length: shDegree }, (_, degree) => Array .from ({ length: this .coefsForDegree (degree) }) .map (() => [ ]));

      for (let i = 0; i < numPoints; ++ i)
      {
         const stride = shCoefPerChannelPerSplat3 * i;

         for (let d = 0, sh = 0; d < shDegree; ++ d)
         {
            const
               coefs = this .coefsForDegree (d),
               shsD  = splatShs [d];

            for (let c = 0; c < coefs; ++ c)
            {
               const shsDC = shsD [c];

               for (let j = 0; j < 3; ++ j, ++ sh)
                  shsDC .push (shs [stride + sh]);
            }
         }
      }

      // GaussianSplats node only supports up to degree 3.
      const shDegreeMax = Math .min (shDegree, 3);

      for (let d = 0; d < shDegreeMax; ++ d)
      {
         const coefs = this .coefsForDegree (d);

         for (let c = 0; c < coefs; ++ c)
            gaussianSplats [`sphericalHarmonicsDegree${d + 1}Coef${c}`] = splatShs [d] [c];
      }

      // Add nodes to scene.

      switch (version)
      {
         case 1:
         case 2:
         {
            const transform = scene .createNode ("Transform");

            transform .rotation = new X3D .Rotation4 (1, 0, 0, Math .PI);

            transform .children .push (gaussianSplats);
            scene .rootNodes .push (transform);
            break;
         }
         default:
         {
            scene .rootNodes .push (gaussianSplats);
            break;
         }
      }

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

   async parseSplats ()
   {
      const { version } = this .header;

      switch (version)
      {
         case 1:
         case 2:
            return await this .parseSplats12 ();
         case 4:
            return await this .parseSplats4 ();
      }
   }

   async parseSplats4 ()
   {
      const
         SpzModule     = await createSpzModule4 (),
         data          = new Uint8Array (this .buffer),
         gaussianCloud = SpzModule .loadSpzFromBuffer (data, { to: SpzModule .CoordinateSystem .RUB });

      return gaussianCloud;
   }

   parseSplats12 ()
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
         numShs: numPoints * shDimension * 3,
      };

      // Read data sections.

      const array = new Uint8Array (this .buffer);

      let currentOffset = this .offset;

      packed .positions = array .subarray (currentOffset, currentOffset += packed .numPositions);
      packed .opacities = array .subarray (currentOffset, currentOffset += packed .numOpacities);
      packed .colors    = array .subarray (currentOffset, currentOffset += packed .numColors);
      packed .scales    = array .subarray (currentOffset, currentOffset += packed .numScales);
      packed .rotations = array .subarray (currentOffset, currentOffset += packed .numRotations);
      packed .shs       = array .subarray (currentOffset, currentOffset += packed .numShs);

      // Verify we read the expected amount of data.

      if (currentOffset !== this .buffer .byteLength)
         throw new Error ("x_ite-spz-parser: incorrect buffer size.");

      return this .unpackSplats (packed);
   }

   unpackSplats (packed)
   {
      const { numPoints, positions, rotations, scales, colors, shs, shDegree } = packed;
      const shDimension = this .dimForDegree (shDegree);
      const usesFloat16 = positions .length === numPoints * 3 * 2;

      // Validate sizes.

      if (!this .checkSizes2 (packed, numPoints, shDimension, usesFloat16))
         throw new Error ("x_ite-spz-parser: incorrect array sizes.");

      const
         splatPositions = [ ],
         splatRotations = [ ],
         splatScales    = [ ],
         splatAlphas    = [ ],
         splatColors    = [ ],
         splatShs       = shs .map (value => this .unquantizeSH (value));

      let halfData;

      if (usesFloat16)
         halfData = new Uint16Array (positions .buffer, positions .byteOffset, numPoints * 3);

      const fullPrecisionPositionScale = 1 / (1 << packed .fractionalBits);

      for (let i = 0; i < numPoints; ++ i)
      {
         // Get splat position.

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

         // Get splat scale.

         for (let j = 0; j < 3; ++ j)
            splatScales .push (scales [i * 3 + j] / 16 - 10);

         // Get splat rotation.

         const r = rotations .subarray (i * 3, i * 3 + 3);

         const xyz = [
            r [0] / 127.5 - 1,
            r [1] / 127.5 - 1,
            r [2] / 127.5 - 1,
         ];

         splatRotations .push (xyz [0]);
         splatRotations .push (xyz [1]);
         splatRotations .push (xyz [2]);

         const squaredNorm = Math .hypot (xyz [0], xyz [1], xyz [2]);

         splatRotations .push (Math .sqrt (Math .max (0, 1 - squaredNorm)));

         // Get splat opacity.

         splatAlphas .push (this .invSigmoid (packed .opacities [i] / 255));

         // Get splat color.

         for (let j = 0; j < 3; ++ j)
            splatColors .push (((colors [i * 3 + j] / 255) - 0.5) / COLOR_SCALE);
      }

      return {
         numPoints,
         positions: splatPositions,
         rotations: splatRotations,
         scales: splatScales,
         alphas: splatAlphas,
         colors: splatColors,
         sh: splatShs,
         shDegree,
      };
   }

   invSigmoid (x)
   {
      return Math .log (x / (1 - x));
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

      if (packed .shs .length !== numPoints * shDimension * 3)
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
         case 4: return 24;
      }
   }

   coefsForDegree (degree)
   {
      switch (degree)
      {
         case 0: return 3;
         case 1: return 5;
         case 2: return 7;
         case 3: return 9;
      }
   }
}

X3D .GoldenGate .addParsers (SPZParser);
