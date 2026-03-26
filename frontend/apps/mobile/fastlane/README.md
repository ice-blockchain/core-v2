fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios fetch_certs

```sh
[bundle exec] fastlane ios fetch_certs
```

Fetch certificates and profiles for appstore, adhoc, and development

### ios setup_signing

```sh
[bundle exec] fastlane ios setup_signing
```

Configure code signing settings for the build target

### ios update_certs

```sh
[bundle exec] fastlane ios update_certs
```

Renew and push certificates and profiles for appstore, adhoc, and development

### ios distribute_firebase

```sh
[bundle exec] fastlane ios distribute_firebase
```

Distribute IPA to Firebase App Distribution

### ios distribute_appstore

```sh
[bundle exec] fastlane ios distribute_appstore
```

Upload IPA to App Store Connect

----


## Android

### android distribute_firebase

```sh
[bundle exec] fastlane android distribute_firebase
```

Distribute APK to Firebase App Distribution

### android distribute_playstore

```sh
[bundle exec] fastlane android distribute_playstore
```

Upload AAB to Google Play Store

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
