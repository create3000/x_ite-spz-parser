const X3D = window [Symbol .for ("X_ITE.X3D")];

/*
 * Parser
 */

class SPZParser extends X3D .X3DParser
{
   constructor (scene)
   {
      super (scene);
   }

   getEncoding ()
   {
      return "ARRAY_BUFFER";
   }

   setInput (input)
   {
      this .input    = input;
      this .dataView = new DataView (input);
   }

   isValid ()
   {
      // Check magic.

      if (this .dataView .getUint32 (0, true) !== 0x5053474e)
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
}

X3D .GoldenGate .addParsers (SPZParser);
