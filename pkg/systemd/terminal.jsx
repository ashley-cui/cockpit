import cockpit from "cockpit";
import 'cockpit-dark-theme'; // once per page
import '../lib/patternfly/patternfly-5-cockpit.scss';

import React from "react";
import { createRoot } from "react-dom/client";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { NumberInput } from "@patternfly/react-core/dist/esm/components/NumberInput/index.js";
import { Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { Modal } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from '@patternfly/react-core/dist/esm/components/Button';


import "./terminal.scss";

import { Terminal } from "cockpit-components-terminal.jsx";

const _ = cockpit.gettext;

(function() {
    cockpit.translate();

    /*
     * A terminal component for the cockpit user.
     *
     * Uses the Terminal component from base1 internally, but adds a header
     * with title and Reset button.
     *
     * Spawns the user's shell in the user's home directory.
     */
    class UserTerminal extends React.Component {
        createChannel(user, dir) {
            const ch = cockpit.channel({
                payload: "stream",
                spawn: [user.shell || "/bin/bash"],
                environ: [
                    "TERM=xterm-256color",
                ],
                directory: dir || user.home || "/",
                pty: true,
                binary: true,
            });
            ch.addEventListener("ready", (_, msg) => this.setState({ pid: msg.pid }), { once: true });
            ch.addEventListener("close", () => this.setState({ pid: null }), { once: true });
            return ch;
        }

        constructor(props) {
            super(props);

            let theme = localStorage.getItem('terminal:theme');
            let size = localStorage.getItem('terminal:font-size');
            // HACK: Try to read the configuration from localStorage, if it does not exists fall back
            // to the old configuration stored in a browser's cookie. After enough time has been
            // passed this can be dropped.
            if (theme === null || theme === "") {
                theme = document.cookie.replace(/(?:(?:^|.*;\s*)theme_cookie\s*=\s*([^;]*).*$)|^.*$/, "$1");
                if (theme !== "") {
                    localStorage.setItem('terminal:theme', theme);
                    this.invalidateCookie("theme_cookie");
                }
            }
            if (size === null || size === "") {
                size = document.cookie.replace(/(?:(?:^|.*;\s*)size_cookie\s*=\s*([^;]*).*$)|^.*$/, "$1");
                if (size !== "") {
                    localStorage.setItem('terminal:font-size', size);
                    this.invalidateCookie("size_cookie");
                }
            }

            this.state = {
                title: 'Terminal',
                theme: theme || "black-theme",
                size: parseInt(size) || 16,
                openModal: false,
                pid: null,
            };
            this.onTitleChanged = this.onTitleChanged.bind(this);
            this.onResetClick = this.onResetClick.bind(this);
            this.onThemeChanged = this.onThemeChanged.bind(this);
            this.onPlus = this.onPlus.bind(this);
            this.onMinus = this.onMinus.bind(this);
            this.onModal = this.onModal.bind(this);
            this.onNavigate = this.onNavigate.bind(this);

            this.terminalRef = React.createRef();
            this.resetButtonRef = React.createRef();

            this.minSize = 6;
            this.maxSize = 40;
            // this.isModalOpen = false;
        }

        async componentDidMount() {


            cockpit.addEventListener("locationchanged", this.onNavigate);
            this.onNavigate()
        // return () => cockpit.removeEventListener("locationchanged", onNavigate);
        //     const user = await cockpit.user();
        //     this.setState({ user, channel: this.createChannel(user, cockpit.location.options.path) });
        }

        componentWillUnmount() {
            cockpit.removeEventListener("locationchanged", this.onNavigate);
        }

        onTitleChanged(title) {
            this.setState({ title });
        }

        async onNavigate(){
            const { options, path } = cockpit.location;
            console.log(path)
            console.log(options.path)
            console.log("HERE HERE HERE")
            const user = await cockpit.user();
            console.log(this.state.pid)
            if (this.state.pid !== null){
                // const cmmd = "grep -r '^PPid:[[:space:]]*" + this.state.pid + "$' /proc/*/status";
                const cmmd = "grep -r '^Pid:[[:space:]]*" + this.state.pid + "$' /proc/*/status";
                const pid = await cockpit.script(cmmd, [], { err: "message"});
                console.log(pid);

                // this.state.openModal = true
            }
            // const cmmd = "ls -R /home/admin/a/*"
            // const pid = await cockpit.spawn(["bash", "-c", cmmd]);

            this.setState({ user, channel: this.createChannel(user, cockpit.location.options.path) });

            // const pid = await cockpit.spawn(["grep", "-r", "'^PPid:[[:space:]]*" + this.state.pid + "$'", "/proc/*/status"]);
            console.log(this.state.pid)

        }


        invalidateCookie(key) {
            const cookie = key + "=''" +
                         "; path=/; Max-Age=0;";
            document.cookie = cookie;
        }

        onPlus() {
            this.setState((state, _) => {
                localStorage.setItem('terminal:font-size', state.size + 1);
                return { size: state.size + 1 };
            });
        }

        onMinus() {
            this.setState((state, _) => {
                localStorage.setItem('terminal:font-size', state.size - 1);
                return { size: state.size - 1 };
            });
        }

        onThemeChanged(_, value) {
            this.setState({ theme: value });
            localStorage.setItem('terminal:theme', value);
        }

        onResetClick(event) {
            if (event.button !== 0)
                return;

            if (!this.state.channel.valid && this.state.user){
                this.setState(prevState => ({ channel: this.createChannel(prevState.user) }));
            }
            else{
                this.terminalRef.current.reset();
            }

            // don't focus the button, but keep it on the terminal
            this.resetButtonRef.current.blur();
            this.terminalRef.current.focus();
        }

        // onOpenPath(){
        //     this.terminalRef.current.reset();
        //     this.setState({ channel: this.createChannel(this.state.user, cockpit.location.options.path) });
        //     cockpit.location.replace("/")
        // }

        onModal(){
            this.setState({ openModal: false });
            // this.onOpenPath()
        }

        render() {
            // this.state.openModal=true;
            const terminal = this.state.channel
                ? <Terminal ref={this.terminalRef}
                            channel={this.state.channel}
                            theme={this.state.theme}
                            fontSize={this.state.size}
                            parentId="the-terminal"
                            onTitleChanged={this.onTitleChanged} />
                : <span>Loading...</span>;
            return (
                <div className="console-ct-container">
                    <div className="terminal-group">
                        <tt className="terminal-title">{this.state.title}</tt>
                        <Toolbar id="toolbar">
                            <ToolbarContent>
                                <ToolbarGroup>
                                    <ToolbarItem variant="label" id="size-select">
                                        {_("Font size")}
                                    </ToolbarItem>
                                    <ToolbarItem>
                                        <NumberInput
                                            className="font-size"
                                            value={this.state.size}
                                            min={this.minSize}
                                            max={this.maxSize}
                                            onMinus={this.onMinus}
                                            onPlus={this.onPlus}
                                            inputAriaLabel={_("Font size")}
                                            minusBtnAriaLabel={_("Decrease by one")}
                                            plusBtnAriaLabel={_("Increase by one")}
                                            widthChars={2}
                                        />
                                    </ToolbarItem>
                                </ToolbarGroup>
                                <ToolbarGroup>
                                    <ToolbarItem variant="label" id="theme-select">
                                        {_("Appearance")}
                                    </ToolbarItem>
                                    <ToolbarItem>
                                        <FormSelect onChange={this.onThemeChanged}
                                                    aria-labelledby="theme-select"
                                                    value={this.state.theme}>
                                            <FormSelectOption value='black-theme' label={_("Black")} />
                                            <FormSelectOption value='dark-theme' label={_("Dark")} />
                                            <FormSelectOption value='light-theme' label={_("Light")} />
                                            <FormSelectOption value='white-theme' label={_("White")} />
                                        </FormSelect>
                                    </ToolbarItem>
                                </ToolbarGroup>
                                <ToolbarItem>
                                    <button ref={this.resetButtonRef}
                                            className="pf-v5-c-button pf-m-secondary terminal-reset"
                                            onClick={this.onResetClick}>{_("Reset")}</button>
                                </ToolbarItem>
                                <ToolbarItem>
                                    <span>shell pid: {this.state.pid}</span>
                                </ToolbarItem>
                                <ToolbarItem>
                                <button ref={this.asdf}
                    className="pf-v5-c-button pf-m-secondary asdf"
                     onClick={() => {this.setState({ openModal: true })}}>{_("asdf")}</button>
                                </ToolbarItem>
                                <ToolbarItem>
                                <button ref={this.send}
                    className="pf-v5-c-button pf-m-secondary send"
                     onClick={() => {this.state.channel.send("ls")}}>{_("send")}</button>
                     </ToolbarItem>
                            </ToolbarContent>
                        </Toolbar>
                        <Modal title={_("Change directory?")}
                       position="top"
                       variant="small"
                       isOpen={this.state.openModal}
                       onClose={() => this.setState({ openModal: false })}
                       actions={[
                            <Button key="yeah" variant="primary" onClick={this.onModal}>
                               {_("Change directory")}
                           </Button>,
                           <Button key="cancel" variant="secondary" onClick={() => this.setState({ openModal: false })}>
                               {_("Cancel")}
                           </Button>
                       ]}>
                    {_("There is still a process running in this terminal.\nChanging the directory will kill it.")}
                </Modal>
                    </div>
                    <div className={"terminal-body " + this.state.theme} id="the-terminal">
                        {terminal}
                    </div>
                </div>
            );
        }
    }
    // console.log(cockpit.location.options.path);
    UserTerminal.displayName = "UserTerminal";
    const root = createRoot(document.getElementById('terminal'));
    root.render(<UserTerminal />);
    // cockpit.location.replace("/")
    /* And show the body */
    document.body.removeAttribute("hidden");
}());




