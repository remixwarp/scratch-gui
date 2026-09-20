declare module "pixi.js" {
  export type Application = any;
  export type Container = any;
  export type Texture = any;
  export type Sprite = any;
  export type Graphics = any;
  export type GraphicsPath = any;
  export type Text = any;
  export type RenderTexture = any;
  export const Application: any;
  export const Container: any;
  export const Texture: any;
  export const Sprite: any;
  export const Graphics: any;
  export const GraphicsPath: any;
  export const Text: any;
  export const RenderTexture: any;
  const PIXI: any;
  export default PIXI;
}

declare module "fastdom" {
  const fastdom: any;
  export default fastdom;
}

interface PluginContext {
  vm: any;
  blockly: any;
  workspace: any;
  intl?: any;
  server?: any;
  trackEvents?: any;
  redux?: any;
  utils?: {
    addCostumeToTarget?: (...args: any[]) => Promise<any[]>;
    deleteCostumeByTargetId?: (...args: any[]) => void;
    updateCostumeByTargetId?: (...args: any[]) => Promise<void>;
    getCostumeFromTarget?: (...args: any[]) => Promise<any> | any;
    [key: string]: any;
  };
  teamworkManager?: any;
  registerSettings?: any;
  msg?: (descriptor: string) => string;
  /** 是否以嵌入模式渲染（撑满父容器，不使用浮动按钮/拖拽） */
  embedded?: boolean;
}
