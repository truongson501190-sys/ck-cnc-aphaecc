declare module 'html5-qrcode' {
  export interface CameraConfig {
    facingMode?: 'user' | 'environment' | string;
  }

  export interface Html5QrcodeConfig {
    fps?: number;
    qrbox?: number;
    [key: string]: unknown;
  }

  export class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: string | CameraConfig,
      configurations?: Html5QrcodeConfig,
      qrCodeSuccessCallback?: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void,
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
  }
  export default Html5Qrcode;
}
