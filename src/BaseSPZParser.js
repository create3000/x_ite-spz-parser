/*
* Base SPZ Parser
*/

export default X3D => class BaseSPZParser extends X3D .X3DParser
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
      scene .addComponent (browser .getComponent ("GaussianSplats"));

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
         numPoints = gaussianCloud .numPoints,
         shs       = gaussianCloud .sh,
         shDegree  = gaussianCloud .shDegree;

      this .setSphericalHarmonics (numPoints, shs, shDegree, gaussianSplats);

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

      scene .addNamedNode (scene .getUniqueName ("GaussianSplats"), gaussianSplats);
      scene .addExportedNode (scene .getUniqueExportName ("GaussianSplats"), gaussianSplats);

      return scene;
   }

   setSphericalHarmonics (numSplats, shs, shDegree, gaussianSplats)
   {
      const
         shCoeffs  = this .dimForDegree (shDegree),
         shCoeffs3 = this .dimForDegree (shDegree) * 3,
         splatShs  = Array .from ({ length: shCoeffs }, () => [ ]);

      for (let c = 0; c < shCoeffs; ++ c)
      {
         const
            c3      = c * 3,
            splatSh = splatShs [c];

         for (let i = 0; i < numSplats; ++ i)
         {
            const offset = shCoeffs3 * i + c3;

            for (let j = 0; j < 3; ++ j)
               splatSh .push (shs [offset + j]);
         }
      }

      // GaussianSplats node only supports up to degree 3.
      const shDegreeMax = Math .min (shDegree, 3);

      for (let d = 0, i = 0; d < shDegreeMax; ++ d)
      {
         const coefs = this .coefsForDegree (d);

         for (let c = 0; c < coefs; ++ c, ++ i)
            gaussianSplats [`sphericalHarmonicsDegree${d + 1}Coef${c}`] = splatShs [i];
      }
   }

   parseHeader ()
   {
      if (this .buffer .byteLength < 16)
         return;

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

   dimForDegree (degree)
   {
      return (degree + 1) ** 2 - 1;
   }

   coefsForDegree (degree)
   {
      return degree * 2 + 3;
   }
};
