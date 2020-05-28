const create: any = require("react-test-renderer").create;
import React from "react";
import { act } from "react-dom/test-utils";
import Terria from "../../lib/Models/Terria";
import ViewState from "../../lib/ReactViewModels/ViewState";
import { runInAction } from "mobx";
import WelcomeMessage, {
  WelcomeMessagePure
} from "../../lib/ReactViews/WelcomeMessage/WelcomeMessage";
import { ThemeProvider } from "styled-components";
import { terriaTheme } from "../../lib/ReactViews/StandardUserInterface/StandardTheme";

describe("WelcomeMessage", function() {
  let terria: Terria;
  let viewState: ViewState;

  let testRenderer: any;

  beforeEach(function() {
    terria = new Terria({
      baseUrl: "./"
    });
    viewState = new ViewState({
      terria: terria,
      catalogSearchProvider: null,
      locationSearchProviders: []
    });
  });

  it("renders when showWelcomeMessage is set to true in config file", function() {
    runInAction(() => (terria.configParameters.showWelcomeMessage = true));
    act(() => {
      testRenderer = create(
        <ThemeProvider theme={terriaTheme}>
          <WelcomeMessage viewState={viewState} />
        </ThemeProvider>
      );
    });
    const welcomeMessagePure = testRenderer.root.findByType(WelcomeMessagePure);
    expect(welcomeMessagePure.props.showWelcomeMessage).toEqual(true);
  });

  it("doesn't render when showWelcomeMessage is set to true in config file", function() {
    runInAction(() => (terria.configParameters.showWelcomeMessage = false));
    act(() => {
      testRenderer = create(
        <ThemeProvider theme={terriaTheme}>
          <WelcomeMessage viewState={viewState} />
        </ThemeProvider>
      );
    });
    const welcomeMessagePure = testRenderer.root.findByType(WelcomeMessagePure);
    expect(welcomeMessagePure.props.showWelcomeMessage).toEqual(false);
  });
});
