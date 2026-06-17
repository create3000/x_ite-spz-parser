import createSpzModule from "./spz-2.1.0-adobe.27/spz.js";
import BaseSPZParser   from "./BaseSPZParser.js";
import register        from "../node_modules/x_ite-extension/dist/x_ite-extension.js";

/*
* Parser
* Reference: https://github.com/nianticlabs/spz
*/

register (async X3D => class SPZParser extends BaseSPZParser (X3D)
{
   static
   {
      X3D .GoldenGate .addParsers (this);
   }

   isValid ()
   {
      if (!this .header)
         return false;

      const { magic, version } = this .header;

      // Check magic.

      if (magic !== 0x5053474e)
         return false;

      // Validate header.

      if (version < 1 || version > 3)
         return false;

      return true;
   }

   async parseSplats ()
   {
      const
         SpzModule     = await createSpzModule (),
         data          = new Uint8Array (this .buffer),
         gaussianCloud = SpzModule .loadSpzFromBuffer (data, { to: SpzModule .CoordinateSystem .RUB });

      return gaussianCloud;
   }
});
