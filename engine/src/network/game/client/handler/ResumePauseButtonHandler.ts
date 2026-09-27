import Component from '#/cache/config/Component.js';
import Player from '#/engine/entity/Player.js';
import ScriptState from '#/engine/script/ScriptState.js';
import ClientGameMessageHandler from '#/network/game/client/ClientGameMessageHandler.js';
import ResumePauseButton from '#/network/game/client/model/ResumePauseButton.js';

export default class ResumePauseButtonHandler extends ClientGameMessageHandler<ResumePauseButton> {
    handle(message: ResumePauseButton, player: Player): boolean {
        if (!player.activeScript || player.activeScript.execution !== ScriptState.PAUSEBUTTON) {
            // Allstar-City: "Click here to continue" on a sticky chat interface no script waits on
            // (the Allstar-Scape level-up boxes, opened with tut_open) closes it.
            if (player.modalTutorial !== -1 && Component.get(message.component)?.rootLayer === player.modalTutorial) {
                player.closeTutorial();
                return true;
            }
            return false;
        }

        player.executeScript(player.activeScript, true, true);
        return true;
    }
}
