const X3D = window [Symbol .for ("X_ITE.X3D")];

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

   setInput (input)
   {
      this .input    = input;
      this .dataView = new DataView (input);
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

      await this .loadComponents ();

      return scene;
   }

   parseHeader ()
   {
      const { dataView } = this;

      return {
         magic: dataView .getUint32 (this .offset, true),
         version: dataView .getUint32 (this .offset += 4, true),
         numPoints: dataView .getUint32 (this .offset += 4, true),
         shDegree: dataView .getUint8 (this .offset += 4),
         fractionalBits: dataView .getUint8 (this .offset += 1),
         flags: dataView .getUint8 (this .offset += 1),
         reserved: dataView .getUint8 (this .offset += 1),
      };
   }
}

X3D .GoldenGate .addParsers (SPZParser);
