import { default as createSpzModule4 } from "./spz-3.0.0/spz.js";
import { default as createSpzModule123 } from "./spz-2.1.0-adobe.27/spz.js";

const X3D = window [Symbol .for ("X_ITE.X3D")];

/*
 * Parser
 */

// https://github.com/mkkellogg/GaussianSplats3D/blob/main/src/loaders/spz/SpzLoader.js

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

   setInput (buffer)
   {
      this .buffer = buffer;
      this .header = this .parseHeader ();
   }

   isValid ()
   {
      const { magic, version } = this .header;

      // Check magic.

      if (magic !== 0x5053474e)
         return false;

      // Validate header.

      if (version < 1 || version > 4)
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
         case 3:
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
      const dataView = new DataView (this .buffer);

      let offset = 0;

      const header = {
         magic: dataView .getUint32 (offset, true),
         version: dataView .getUint32 (offset += 4, true),
         numPoints: dataView .getUint32 (offset += 4, true),
         shDegree: dataView .getUint8 (offset += 4),
         fractionalBits: dataView .getUint8 (offset += 1),
         flags: dataView .getUint8 (offset += 1),
         reserved: dataView .getUint8 (offset),
      };

      return header;
   }

   async parseSplats ()
   {
      const { version } = this .header;

      switch (version)
      {
         case 1:
         case 2:
         case 3:
            return await this .parseSplats123 ();
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

   async parseSplats123 ()
   {
      const
         SpzModule     = await createSpzModule123 (),
         data          = new Uint8Array (this .buffer),
         gaussianCloud = SpzModule .loadSpzFromBuffer (data, { to: SpzModule .CoordinateSystem .RUB });

      return gaussianCloud;
   }

   dimForDegree (degree)
   {
      return (degree + 1) ** 2 - 1;
   }

   coefsForDegree (degree)
   {
      return degree * 2 + 3;
   }
}

X3D .GoldenGate .addParsers (SPZParser);
