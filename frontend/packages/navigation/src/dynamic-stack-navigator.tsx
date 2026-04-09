import {
  createNavigatorFactory,
  useNavigationBuilder,
  StackRouter,
  type DefaultNavigatorOptions,
  type ParamListBase,
  type StackActionHelpers,
  type StackNavigationState,
  type StackRouterOptions,
} from '@react-navigation/native';

type DynamicStackOptions = { title?: string };
type DynamicStackEventMap = Record<string, never>;

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  StackNavigationState<ParamListBase>,
  DynamicStackOptions,
  DynamicStackEventMap,
  StackActionHelpers<ParamListBase>
> & StackRouterOptions;

type Builder = typeof useNavigationBuilder<
  StackNavigationState<ParamListBase>,
  StackRouterOptions,
  StackActionHelpers<ParamListBase>,
  DynamicStackOptions,
  DynamicStackEventMap
>;

function DynamicStackNavigator({ id, initialRouteName, children, screenListeners, screenOptions }: Props) {
  // React Navigation's public API types don't round-trip cleanly under
  // `exactOptionalPropertyTypes: true`: `StackRouter`'s action and the
  // options object both have `foo?: T` fields that TS treats as strict.
  // These casts are safe — same router and shape `@react-navigation/native-stack` uses.
  const router = StackRouter as unknown as Parameters<Builder>[0];
  const options = { id, initialRouteName, children, screenListeners, screenOptions } as Parameters<Builder>[1];
  const { state, descriptors, NavigationContent } = (useNavigationBuilder as Builder)(router, options);

  const focused = state.routes[state.index];
  const descriptor = focused ? descriptors[focused.key] : undefined;
  return <NavigationContent>{descriptor ? descriptor.render() : null}</NavigationContent>;
}

export const createDynamicStackNavigator = createNavigatorFactory(DynamicStackNavigator);
