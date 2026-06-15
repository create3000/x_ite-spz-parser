import { default as createSpzModule } from "./spz-3.0.0/spz.js";
import BaseSPZParser from "./BaseSPZParser.js";

const X3D = window [Symbol .for ("X_ITE.X3D")];

/*
 * Parser
 * Reference: https://github.com/nianticlabs/spz
 */

class SPZParser extends BaseSPZParser
{
   isValid ()
   {
      const { magic, version } = this .header;

      // Check magic.

      if (magic !== 0x5053474e)
         return false;

      // Validate header.

      if (version < 4 || version > 4)
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
}

X3D .GoldenGate .addParsers (SPZParser);
