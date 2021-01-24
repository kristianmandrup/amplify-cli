# Changelog

## Flexible folders and filenames

- Added use of optional `.amplifyrc.json` file to store path constants used
- Added ability to override path constant defaults with those stored in `.amplifyrc.json`

This is primarily added to allow for a flexible folder structure, so that you are not forced into the `amplify/backend` convention. This is especially useful in a monorepo setup.

## Separating backend into multiple folders and contexts

This feature allows the execution of an amplify command to be applied across a set of configurable context folders in a project. Each context can have custom configuration. For a push, all the resources found across all the context folders are used to calculate resources to be updated. Currently there is no good way to define in which context any particular diff should be applied. We need to define some kind of domain or tag for each context that is linked to the cloud resource, (such as by tag convention) so that this is clear and feasible.