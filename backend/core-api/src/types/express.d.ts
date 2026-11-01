declare module 'multer' {
  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
    stream?: any;
  }

  export interface FileFilterCallback {
    (error: Error | null, acceptFile?: boolean): void;
  }

  export interface StorageEngine {
    _handleFile(req: any, file: any, cb: any): void;
    _removeFile(req: any, file: any, cb: any): void;
  }

  export interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fileSize?: number;
      [key: string]: any;
    };
    fileFilter?(
      req: any,
      file: any,
      callback: any
    ): void;
  }

  export interface Instance {
    single(fieldName?: string): any;
    array(fieldName?: string, maxCount?: number): any;
    fields(fields: any[]): any;
    none(): any;
    any(): any;
  }

  export interface MulterStatic {
    (options?: Options): Instance;
    diskStorage(options: any): StorageEngine;
    memoryStorage(): StorageEngine;
    MulterError: any;
  }

  const multer: MulterStatic;
  export default multer;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
      stream?: any;
    }
  }
  interface Request {
    file?: any;
    files?: any;
  }
}