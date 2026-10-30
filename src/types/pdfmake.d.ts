declare module "pdfmake" {
  interface PdfMakeServer {
    virtualfs: {
      writeFileSync: (name: string, content: Buffer) => void;
    };
    addFonts: (fonts: Record<string, unknown>) => void;
    setUrlAccessPolicy: (policy: (url: string) => boolean) => void;
    setLocalAccessPolicy: (policy: (path: string) => boolean) => void;
    createPdf: (definition: Record<string, unknown>) => {
      getBuffer: () => Promise<Buffer>;
    };
  }

  const pdfMake: PdfMakeServer;
  export default pdfMake;
}

declare module "pdfmake/build/fonts/Roboto.js" {
  const fontContainer: {
    vfs: Record<string, { data: string }>;
    fonts: Record<string, unknown>;
  };
  export default fontContainer;
}
