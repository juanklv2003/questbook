import React from 'react';
import { Button } from './Button';
import { redirectToGoogleLogin } from '../../lib/googleAuth';
import { useLanguage } from '../../i18n/LanguageContext';

interface GoogleSignInButtonProps {
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ disabled }) => {
  const { t } = useLanguage();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="flex w-full items-center gap-2"
      onClick={() => redirectToGoogleLogin()}
      disabled={disabled}
    >
      <img src="https://www.google.com/favicon.ico" alt="" width={20} height={20} aria-hidden="true" />
      {t('auth.googleLogin')}
    </Button>
  );
};
