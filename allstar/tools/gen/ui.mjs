// ui workstream generator steps: id enums for ::commands and the TextHandler login relabels.
import ids from './ids.mjs';
import texts from './texts.mjs';

export default function ui(ctx) {
    ids(ctx);
    texts(ctx);
}
