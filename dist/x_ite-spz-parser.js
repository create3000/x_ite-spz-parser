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
      this .input = input;
   }

   isValid ()
   {
      return this .input .match (/^OFF/);
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
