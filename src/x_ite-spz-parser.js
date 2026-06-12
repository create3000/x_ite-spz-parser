const X3D = window [Symbol .for ("X_ITE.X3D")];

const FLAG_ANTIALIASED = 1;

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
      const { version, numPoints, shDegree, fractionalBits, flags } = this .header;

      const
         shDimension = this .dimForDegree (shDegree),
         usesFloat16 = version === 1;

      // Initialize result object.

      const result = {
         numPoints,
         shDegree,
         fractionalBits,
         antialiased: (flags & FLAG_ANTIALIASED) !== 0,
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

      result .positions = array .subarray (currentOffset, currentOffset += result .numPositions);
      result .opacities = array .subarray (currentOffset, currentOffset += result .numOpacities);
      result .colors    = array .subarray (currentOffset, currentOffset += result .numColors);
      result .scales    = array .subarray (currentOffset, currentOffset += result .numScales);
      result .rotations = array .subarray (currentOffset, currentOffset += result .numRotations);
      result .sh        = array .subarray (currentOffset, currentOffset += result .numSh);

      // Verify we read the expected amount of data
      if (currentOffset !== this .buffer .byteLength)
         throw new Error ("x_ite-spz-parser: incorrect buffer size.");

      console .log (result)

      const
         browser = this .getBrowser (),
         scene   = this .getScene ();

      scene .setEncoding ("SPZ");
      scene .setProfile (browser .getProfile ("Interchange"));
      scene .addComponent (browser .getComponent ("X_ITE"));

      await this .getBrowser () .loadComponents (scene);

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

   halfToFloat (h)
   {
      const sgn = (h >> 15) & 0x1;
      const exponent = (h >> 10) & 0x1f;
      const mantissa = h & 0x3ff;

      const signMul = sgn === 1 ? -1.0 : 1.0;
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
      return (x - 128.0) / 128.0;
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
