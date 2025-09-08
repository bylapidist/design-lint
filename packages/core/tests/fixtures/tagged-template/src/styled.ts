import styled from 'styled-components';
import { css } from '@emotion/css';

export const Styled = styled.div`
  color: red;
`;

export const Emotion = css`
  color: red;
`;

const colorVar = 'blue';
export const Dynamic = styled.div`
  color: ${colorVar};
`;
