import clipboard from "clipboard";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Box from "../Styled/Box";
import { verticalAlign } from "../Styled/mixins";
import Icon, { StyledIcon } from "./Icon";

const Spacing: React.ComponentType<{
  bottom?: number;
}> = require("../Styled/Spacing").default;
const Button: React.ComponentType<any> = require("../Styled/Button").default;

interface ClipboardProps {
  id: string;
  source: React.ElementType;
  theme: "dark" | "light";
}

const Clipboard: React.FC<ClipboardProps> = props => {
  const { id, source, theme } = props;
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState<boolean | null>(null);
  useEffect(() => {
    // Setup clipboard.js and show a tooltip on copy success or error for 3s
    const clipboardBtn = new clipboard(`.btn-copy-${id}`);
    let timerId: ReturnType<typeof setTimeout> | null = null;
    function removeTimeout() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    }
    function resetTooltipLater() {
      removeTimeout();
      timerId = setTimeout(() => {
        setCopySuccess(null);
      }, 3000);
    }
    clipboardBtn.on("success", () => {
      setCopySuccess(true);
      resetTooltipLater();
    });
    clipboardBtn.on("error", () => {
      setCopySuccess(false);
      resetTooltipLater();
    });
    return function cleanup() {
      removeTimeout();
      clipboardBtn.destroy();
    };
  }, [id]);

  const isLightTheme = theme === "light";
  return (
    <ClipboardDiv>
      <span>{t("clipboard.shareURL")}</span>
      <Spacing bottom={2} />
      <Explanation>{t("clipboard.shareExplanation")}</Explanation>
      <Spacing bottom={3} />
      <Box>
        {source}
        <Button
          primary
          css={`
            width: 80px;
            border-radius: 2px;
          `}
          className={`btn-copy-${id}`}
          data-clipboard-target={`#${id}`}
          textProps={{ large: true }}
        >
          {t("clipboard.copy")}
        </Button>
      </Box>
      {copySuccess !== null && (
        <>
          <Spacing bottom={2} />
          <Box
            css={`
              line-height: 10px;
            `}
          >
            <StyledIcon
              light={!isLightTheme}
              realDark={isLightTheme}
              glyph={copySuccess ? Icon.GLYPHS.selected : Icon.GLYPHS.close}
              styledWidth="20px"
              css={`
                margin: 8px;
                margin-left: 0;
                display: inline-block;
              `}
            />
            <TooltipText>
              {copySuccess
                ? t("clipboard.success")
                : t("clipboard.unsuccessful")}
            </TooltipText>
          </Box>
        </>
      )}
    </ClipboardDiv>
  );
};

export default Clipboard;

const ClipboardDiv = styled.div`
  position: relative;
`;

const Explanation = styled.div`
  opacity: 0.8;
`;

const TooltipText = styled.span`
  ${verticalAlign("absolute")}
  left: 30px;
`;
