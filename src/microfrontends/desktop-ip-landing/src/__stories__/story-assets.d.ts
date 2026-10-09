// Растр подключается только в историях Storybook: в блок картинки приходят ссылками из CMS.
declare module '*.jpg' {
  const content: string;
  export default content;
}
